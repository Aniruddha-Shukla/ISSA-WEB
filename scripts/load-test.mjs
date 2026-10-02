#!/usr/bin/env node
// Live-quiz load test against a LOCAL Supabase (`npm run db:start`).
// Simulates N players (default 100) on an M-question live quiz (default 20),
// each with its own session, behaving like the web app: the first REALTIME_CAP
// players (default 80, as in live-quiz.tsx) get Realtime pushes, everyone else
// follows the fast quiz-row probe; fetch the question, answer after a human-ish delay.
//
//   npm run test:load            # 100 players, 20 questions
//   PLAYERS=200 QUESTIONS=10 npm run test:load
//
// Refuses to run against anything but localhost.
import { createHmac, randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const PLAYERS = Number(process.env.PLAYERS ?? 100);
const QUESTIONS = Number(process.env.QUESTIONS ?? 20);
const TIME_LIMIT = Number(process.env.TIME_LIMIT ?? 6); // seconds per question (short to keep the test quick)
// NO_REALTIME=1 simulates Realtime being throttled: phones rely only on the quiz-row probe.
const NO_REALTIME = process.env.NO_REALTIME === "1";
const REALTIME_CAP = NO_REALTIME ? 0 : Number(process.env.REALTIME_CAP ?? 80);
const jitter = (ms) => ms * (0.8 + Math.random() * 0.4);

const env = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.API_URL ?? "")) {
  console.error("Refusing to run: Supabase is not local. Start it with npm run db:start.");
  process.exit(1);
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
function jwtFor(userId, email) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: userId, email, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600 })}`;
  return `${body}.${createHmac("sha256", env.JWT_SECRET).update(body).digest("base64url")}`;
}
const clientFor = (token) =>
  createClient(env.API_URL, env.PUBLISHABLE_KEY || env.ANON_KEY, {
    accessToken: async () => token,
    realtime: { params: { eventsPerSecond: -1 } },
  });

const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY || env.SECRET_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) =>
  arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0;
const tag = randomUUID().slice(0, 8);
const createdUsers = [];
let quizId = null;

async function makeUser(label, i) {
  const email = `load-${tag}-${label}-${i}@college.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: `${label} ${i}` },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  createdUsers.push(data.user.id);
  return { id: data.user.id, token: jwtFor(data.user.id, email) };
}

const stats = {
  pushLatency: [],
  missedPushes: 0,
  answerLatency: [],
  answerErrors: [],
  stateErrors: 0,
  messagesReceived: 0,
  questionDeliveries: 0,
  realtimePlayerDeliveries: 0,
  viaRealtime: 0,
  viaProbe: 0,
  probeRequests: 0,
  probeErrors: 0,
};
let finished = false;

try {
  console.log(
    `${NO_REALTIME ? "[Realtime disabled] " : ""}Setting up ${PLAYERS} players (${Math.min(PLAYERS, REALTIME_CAP)} with Realtime) and a ${QUESTIONS}-question live quiz (${TIME_LIMIT}s per question)…`,
  );
  const hostUser = await makeUser("host", 0);
  await service.from("profiles").update({ role: "admin" }).eq("id", hostUser.id);
  const host = clientFor(hostUser.token);

  const { data: quiz, error: quizError } = await host
    .from("quizzes")
    .insert({ title: `Load test ${tag}`, mode: "live" })
    .select("id")
    .single();
  if (quizError) throw new Error(`create quiz: ${quizError.message}`);
  quizId = quiz.id;
  const questions = Array.from({ length: QUESTIONS }, (_, i) => ({
    prompt: `Load test question ${i + 1}?`,
    options: ["A", "B", "C", "D"],
    correct_index: i % 4,
    time_limit: TIME_LIMIT,
    points: 1000,
  }));
  const saved = await host.rpc("save_quiz_questions", { p_quiz_id: quizId, p_questions: questions });
  if (saved.error) throw new Error(`save questions: ${saved.error.message}`);
  await host.rpc("host_quiz_action", { p_quiz_id: quizId, p_action: "publish" });

  // Players: create accounts in small batches, join, and subscribe like the app does.
  const players = [];
  for (let i = 0; i < PLAYERS; i += 20) {
    players.push(...(await Promise.all(Array.from({ length: Math.min(20, PLAYERS - i) }, (_, k) => makeUser("player", i + k)))));
  }
  let hostActionAt = 0;
  let currentKey = "";
  const seenKeys = players.map(() => new Set());
  const expected = new Map(); // attempt answers we expect to be recorded

  await Promise.all(
    players.map(async (p, idx) => {
      p.client = clientFor(p.token);
      p.live = idx < REALTIME_CAP;
      const joined = await p.client.rpc("join_quiz", { p_quiz_id: quizId });
      if (joined.error) throw new Error(`join: ${joined.error.message}`);
      p.phase = "lobby";

      // Same reaction whether the change arrives by Realtime push or by the probe.
      p.onRow = async (row, source) => {
        p.phase = row.phase;
        const key = `${row.phase}:${row.current_index}:${row.status}`;
        if (key !== currentKey || seenKeys[idx].has(key)) return;
        seenKeys[idx].add(key);
        stats.pushLatency.push(Date.now() - hostActionAt);
        if (p.live) stats.realtimePlayerDeliveries++;
        if (source === "realtime") stats.viaRealtime++;
        else stats.viaProbe++;
        if (row.phase !== "question" || row.status !== "published") return;
        stats.questionDeliveries++;
        const state = await p.client.rpc("get_live_state", { p_quiz_id: quizId });
        if (state.error || !state.data?.question) {
          stats.stateErrors++;
          return;
        }
        await sleep(300 + Math.random() * 2700);
        const q = state.data.question;
        const choice = Math.random() < 0.7 ? questions[q.position].correct_index : (questions[q.position].correct_index + 1) % 4;
        const t0 = Date.now();
        const res = await p.client.rpc("submit_answer", { p_quiz_id: quizId, p_question_id: q.id, p_choice: choice });
        stats.answerLatency.push(Date.now() - t0);
        if (res.error) stats.answerErrors.push(res.error.message);
        else expected.set(`${idx}:${q.position}`, choice === questions[q.position].correct_index);
      };

      if (!p.live) return;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("realtime subscribe timeout")), 20000);
        p.client
          .channel(`quiz:${quizId}:${idx}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "quizzes", filter: `id=eq.${quizId}` },
            (payload) => {
              stats.messagesReceived++;
              void p.onRow(payload.new, "realtime");
            },
          )
          .on("system", {}, (m) => {
            if (m.extension === "postgres_changes" && m.status === "ok") {
              clearTimeout(timer);
              resolve();
            }
          })
          .subscribe();
      });
    }),
  );

  // The app's quiz-row probe: ~1.5s while waiting / 3s mid-question without a push channel,
  // 4s / 6s as a safety net with one.
  for (const p of players) {
    void (async () => {
      await sleep(Math.random() * 2000); // phones don't poll in lockstep
      while (!finished) {
        stats.probeRequests++;
        const { data, error } = await p.client
          .from("quizzes")
          .select("status, phase, current_index")
          .eq("id", quizId)
          .maybeSingle();
        if (error) stats.probeErrors++;
        else if (data) void p.onRow(data, "probe");
        const waiting = p.phase !== "question";
        await sleep(jitter(waiting ? (p.live ? 4000 : 1500) : p.live ? 6000 : 3000));
      }
    })();
  }
  console.log(`All ${PLAYERS} players joined and subscribed. Hosting…`);

  const lobby = await host.rpc("get_live_state", { p_quiz_id: quizId });
  const quizStart = Date.now();
  for (let q = 0; q < QUESTIONS; q++) {
    currentKey = `question:${q}:published`;
    hostActionAt = Date.now();
    await host.rpc("host_quiz_action", { p_quiz_id: quizId, p_action: "next" });
    await sleep(TIME_LIMIT * 1000 + 800);
    const answered = (await host.rpc("get_live_state", { p_quiz_id: quizId })).data?.answered ?? 0;
    currentKey = `reveal:${q}:published`;
    hostActionAt = Date.now();
    await host.rpc("host_quiz_action", { p_quiz_id: quizId, p_action: "reveal" });
    await sleep(1200);
    // after reveal every player refreshes the leaderboard once (as the app does)
    await Promise.all(players.map((p) => p.client.rpc("get_leaderboard", { p_quiz_id: quizId, p_limit: 50 })));
    process.stdout.write(`  Q${q + 1}: ${answered}/${PLAYERS} answered\n`);
  }
  await host.rpc("host_quiz_action", { p_quiz_id: quizId, p_action: "end" });
  finished = true;
  const duration = ((Date.now() - quizStart) / 1000).toFixed(0);

  // Verify every recorded score against what the players submitted.
  const { data: attempts } = await service
    .from("quiz_attempts")
    .select("id, user_id, score, correct_count, answered_count")
    .eq("quiz_id", quizId);
  const { count: responseCount } = await service
    .from("quiz_responses")
    .select("id, quiz_attempts!inner(quiz_id)", { count: "exact", head: true })
    .eq("quiz_attempts.quiz_id", quizId);
  const expectedCorrect = [...expected.values()].filter(Boolean).length;
  const recordedCorrect = attempts.reduce((s, a) => s + a.correct_count, 0);
  const board = await host.rpc("get_leaderboard", { p_quiz_id: quizId, p_limit: 500 });
  const sorted = board.data.every((r, i, all) => i === 0 || all[i - 1].score >= r.score);
  const transitions = QUESTIONS * 2;
  const livePlayers = Math.min(PLAYERS, REALTIME_CAP);
  // Realtime players must see every transition; probe-only phones may skip a very short reveal.
  stats.missedPushes = livePlayers * transitions - stats.realtimePlayerDeliveries;

  console.log(`
Results — ${PLAYERS} players × ${QUESTIONS} questions in ${duration}s
  lobby headcount                 ${lobby.data?.participants} (expected ${PLAYERS})
  host action → phone             ${stats.pushLatency.length}/${PLAYERS * transitions} transitions seen, p50 ${pct(stats.pushLatency, 50)} ms, p95 ${pct(stats.pushLatency, 95)} ms
  realtime players (${livePlayers})           ${stats.realtimePlayerDeliveries}/${livePlayers * transitions} transitions
  questions reached phones         ${stats.questionDeliveries}/${PLAYERS * QUESTIONS}
  first delivery via               realtime ${stats.viaRealtime} · probe ${stats.viaProbe}${NO_REALTIME ? " (Realtime disabled)" : ""}
  realtime messages received      ${stats.messagesReceived} (≈ ${Math.round(stats.messagesReceived / transitions)} per host action; the old per-answer design would add ~${PLAYERS * PLAYERS} per question)
  probe requests                  ${stats.probeRequests} (≈ ${(stats.probeRequests / Math.max(1, Number(duration))).toFixed(0)}/s), ${stats.probeErrors} errors
  answer submissions              ${stats.answerLatency.length} sent, ${stats.answerErrors.length} errors, p50 ${pct(stats.answerLatency, 50)} ms, p95 ${pct(stats.answerLatency, 95)} ms
  question fetch errors           ${stats.stateErrors}
  responses stored                ${responseCount} (expected ${expected.size})
  correct answers scored          ${recordedCorrect} (expected ${expectedCorrect})
  leaderboard ordered by score    ${sorted ? "yes" : "NO"}`);
  if (stats.answerErrors.length) console.log("  sample errors:", [...new Set(stats.answerErrors)].slice(0, 3));
  const ok =
    lobby.data?.participants === PLAYERS &&
    stats.questionDeliveries === PLAYERS * QUESTIONS &&
    stats.missedPushes === 0 &&
    stats.probeErrors === 0 &&
    stats.answerErrors.length === 0 &&
    responseCount === expected.size &&
    recordedCorrect === expectedCorrect &&
    sorted;
  console.log(`\n${ok ? "PASSED" : "FAILED"}`);
  process.exitCode = ok ? 0 : 1;
} catch (error) {
  console.error("Load test crashed:", error);
  process.exitCode = 1;
} finally {
  if (quizId) await service.from("quizzes").delete().eq("id", quizId);
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
  console.log(`Cleaned up ${createdUsers.length} test accounts${quizId ? " and the test quiz" : ""}.`);
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}
