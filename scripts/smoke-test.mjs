#!/usr/bin/env node
// End-to-end smoke test against a LOCAL Supabase stack (`npm run db:start`).
// Exercises auth, RLS, RPCs, storage and realtime the same way the app does,
// using throwaway users that are deleted afterwards.
//
//   npm run test:smoke
//
// Refuses to run against anything but localhost so it can never touch production.
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const URL_ = env.API_URL;
const PUBLIC_KEY = env.PUBLISHABLE_KEY || env.ANON_KEY;
const SERVICE_KEY = env.SERVICE_ROLE_KEY || env.SECRET_KEY;
if (!URL_ || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
  console.error(`Refusing to run: Supabase URL is not local (${URL_ ?? "missing"}). Start it with npm run db:start.`);
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(URL_, SERVICE_KEY, opts);
const anon = createClient(URL_, PUBLIC_KEY, opts);

let passed = 0;
const failures = [];
function check(condition, label, detail) {
  if (condition) {
    passed++;
    console.log(`  ok  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
  }
}
const expectError = (result, pattern, label) =>
  check(result.error && new RegExp(pattern, "i").test(result.error.message), label, result.error?.message ?? "no error");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stamp = Date.now().toString(36);
const password = `Smoke-${stamp}-Pass!`;
const users = {
  admin: { email: `smoke-admin-${stamp}@college.test` },
  player: { email: `smoke-player-${stamp}@college.test` },
  guest: { email: `smoke-guest-${stamp}@outside.test` },
};

const IDS = {
  hackNight: "e0000000-0000-4000-8000-000000000001",
  hackathon: "e0000000-0000-4000-8000-000000000003",
  ctf: "e0000000-0000-4000-8000-000000000004",
  liveQuiz: "f0000000-0000-4000-8000-000000000001",
  selfQuiz: "f0000000-0000-4000-8000-000000000002",
};

async function signUp(key) {
  const client = createClient(URL_, PUBLIC_KEY, opts);
  const { data, error } = await client.auth.signUp({
    email: users[key].email,
    password,
    options: { data: { full_name: `Smoke ${key}`, roll_no: `SMK-${key}`, branch: "CSE", year: "2" } },
  });
  if (error) throw new Error(`signUp ${key}: ${error.message}`);
  users[key].id = data.user.id;
  users[key].client = client;
  return client;
}

const originalSettings = (await service.from("app_settings").select("*").single()).data;

try {
  console.log("\n== sign-up & roles");
  await service
    .from("app_settings")
    .update({ allowed_domains: ["college.test"], auto_member_for_domains: true, restrict_signups: false })
    .eq("id", true);
  await signUp("admin");
  await signUp("player");
  await signUp("guest");
  const roles = await service
    .from("profiles")
    .select("id, role, roll_no")
    .in("id", [users.admin.id, users.player.id, users.guest.id]);
  const roleOf = (id) => roles.data.find((r) => r.id === id);
  check(roleOf(users.player.id)?.role === "member", "college email auto-verified as member");
  check(roleOf(users.guest.id)?.role === "guest", "outside email is a guest");
  check(roleOf(users.player.id)?.roll_no === "SMK-player", "sign-up metadata copied to profile");
  expectError(
    await users.player.client.from("profiles").update({ role: "admin" }).eq("id", users.player.id),
    "Only admins",
    "members cannot promote themselves",
  );
  await service.from("profiles").update({ role: "admin" }).eq("id", users.admin.id);
  const admin = users.admin.client;
  const player = users.player.client;
  const guest = users.guest.client;
  check((await player.from("profiles").select("id")).data?.length === 1, "profiles are private (player sees only self)");
  check((await admin.from("profiles").select("id")).data?.length >= 3, "admin can read all profiles");

  console.log("\n== public data (anonymous)");
  const events = await anon.from("events").select("id, slug, is_published");
  check(events.data?.length >= 7 && events.data.every((e) => e.is_published), "anon sees published events");
  check(Array.isArray((await anon.rpc("quiz_catalog")).data), "quiz_catalog works for anon");
  check(typeof (await anon.rpc("public_stats")).data?.members === "number", "public_stats works for anon");
  expectError(await anon.rpc("register_for_event", { p_event_id: IDS.hackNight }), "permission denied", "anon cannot register");

  console.log("\n== registration & tickets");
  const reg = await player.rpc("register_for_event", { p_event_id: IDS.hackNight, p_team_name: null });
  check(
    /^ISSA-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(reg.data?.ticket_code ?? ""),
    "registration returns a ticket code",
    reg.error?.message,
  );
  const again = await player.rpc("register_for_event", { p_event_id: IDS.hackNight, p_team_name: null });
  check(again.data?.id === reg.data?.id, "registration is idempotent");
  expectError(
    await guest.rpc("register_for_event", { p_event_id: IDS.ctf, p_team_name: null }),
    "members only",
    "guest blocked from members-only event",
  );
  const seats = await anon.rpc("get_event_seats", { p_event_ids: [IDS.hackNight] });
  check(seats.data?.[0]?.registered >= 1, "seat counts include the new registration");
  const mine = await player
    .from("registrations")
    .select("*")
    .eq("event_id", IDS.hackNight)
    .eq("user_id", users.player.id)
    .maybeSingle();
  check(mine.data?.ticket_code === reg.data?.ticket_code, "player can read own ticket");
  check((await guest.from("registrations").select("id")).data?.length === 0, "guest cannot see others' tickets");

  console.log("\n== check-in");
  expectError(await player.rpc("check_in_ticket", { p_code: reg.data.ticket_code }), "Only admins", "non-admins cannot check in");
  const ci = await admin.rpc("check_in_ticket", {
    p_code: `http://localhost:3000/admin/check-in?code=${reg.data.ticket_code.toLowerCase()}`,
  });
  check(
    ci.data?.already_checked_in === false && ci.data?.attendee?.roll_no === "SMK-player",
    "admin checks in from a scanned URL",
    ci.error?.message,
  );
  const dup = await admin.rpc("check_in_ticket", { p_code: reg.data.ticket_code });
  check(dup.data?.already_checked_in === true, "duplicate scan detected");
  const attendees = await admin
    .from("registrations")
    .select("*, attendee:profiles!registrations_user_id_fkey(full_name, email, roll_no, branch, year)")
    .eq("event_id", IDS.hackNight);
  check(
    attendees.data?.some((r) => r.attendee?.email === users.player.email),
    "admin attendee list embeds profiles",
    attendees.error?.message,
  );
  const badge = await player.from("user_badges").select("badge_slug").eq("user_id", users.player.id);
  check(
    badge.data?.some((b) => b.badge_slug === "first-event"),
    "first-event badge awarded on check-in",
  );

  console.log("\n== submissions & storage");
  await player.rpc("register_for_event", { p_event_id: IDS.hackathon, p_team_name: "Smoke Testers" });
  const path = `${IDS.hackathon}/${users.player.id}/${stamp}-demo.txt`;
  const upload = await player.storage
    .from("submissions")
    .upload(path, new Blob(["hello from the smoke test"], { type: "text/plain" }));
  check(!upload.error, "player uploads a private submission file", upload.error?.message);
  const sneaky = await player.storage
    .from("submissions")
    .upload(`${IDS.hackathon}/${users.guest.id}/x.txt`, new Blob(["x"], { type: "text/plain" }));
  check(Boolean(sneaky.error), "player cannot upload into someone else's folder");
  const sub = await player.rpc("upsert_submission", {
    p_event_id: IDS.hackathon,
    p_title: "Smoke Test Project",
    p_description: "desc",
    p_repo_url: "https://github.com/example/repo",
    p_demo_url: null,
    p_file_path: path,
    p_team_name: "Smoke Testers",
  });
  check(sub.data?.status === "submitted", "submission saved via RPC", sub.error?.message);
  const signed = await admin.storage.from("submissions").createSignedUrl(path, 60);
  const fileText = signed.data ? await (await fetch(signed.data.signedUrl)).text() : "";
  check(fileText.includes("smoke test"), "admin downloads the file via signed URL", signed.error?.message);
  const review = await admin
    .from("submissions")
    .update({ status: "accepted", score: 9.5 })
    .eq("id", sub.data.id)
    .select("status")
    .single();
  check(review.data?.status === "accepted", "admin reviews the submission");
  const subList = await admin.from("submissions").select("*, profiles(full_name, email, roll_no)").eq("event_id", IDS.hackathon);
  check(
    subList.data?.some((s) => s.profiles?.email === users.player.email),
    "admin submission list embeds profiles",
    subList.error?.message,
  );

  console.log("\n== live quiz with realtime");
  await admin.rpc("host_quiz_action", { p_quiz_id: IDS.liveQuiz, p_action: "reset" });
  const questions = await admin
    .from("quiz_questions")
    .select("*, quiz_answer_keys(correct_index)")
    .eq("quiz_id", IDS.liveQuiz)
    .order("position");
  const firstKey = questions.data?.[0]?.quiz_answer_keys;
  const correct0 = Array.isArray(firstKey) ? firstKey[0]?.correct_index : firstKey?.correct_index;
  check(typeof correct0 === "number", "admin reads questions with answer keys (1:1 embed)", questions.error?.message);
  check((await player.from("quiz_answer_keys").select("*")).data?.length === 0, "players cannot read answer keys");
  check((await player.from("quiz_questions").select("*")).data?.length === 0, "players cannot read questions directly");

  const joined = await player.rpc("join_quiz", { p_quiz_id: IDS.liveQuiz });
  check(joined.data?.display_name === "Smoke player", "player joins the lobby", joined.error?.message);

  const realtimeEvents = [];
  // Like the app: wait for the "Subscribed to PostgreSQL" system message, not just SUBSCRIBED.
  const subscribed = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), 15000);
    player
      .channel(`quiz:${IDS.liveQuiz}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quizzes", filter: `id=eq.${IDS.liveQuiz}` }, (p) =>
        realtimeEvents.push(p.new.phase),
      )
      .on("system", {}, (m) => {
        if (m.extension === "postgres_changes" && m.status === "ok") {
          clearTimeout(t);
          resolve(true);
        }
      })
      .subscribe();
  });
  const channel = player.getChannels().find((c) => c.topic.endsWith(`quiz:${IDS.liveQuiz}`));
  check(subscribed, "player subscribed to realtime quiz updates");
  // Signed-in users can also follow scores (quiz_attempts is not readable by anon).
  const attemptsOk = await new Promise((resolve) => {
    const t = setTimeout(() => resolve("timeout"), 15000);
    admin
      .channel(`quiz-attempts:${IDS.liveQuiz}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_attempts", filter: `quiz_id=eq.${IDS.liveQuiz}` },
        () => {},
      )
      .on("system", {}, (m) => {
        if (m.extension === "postgres_changes") {
          clearTimeout(t);
          resolve(m.status === "ok" ? "ok" : m.message);
        }
      })
      .subscribe();
  });
  check(attemptsOk === "ok", "signed-in host can subscribe to live score changes", attemptsOk);

  await admin.rpc("host_quiz_action", { p_quiz_id: IDS.liveQuiz, p_action: "next" });
  for (let i = 0; i < 40 && !realtimeEvents.includes("question"); i++) await sleep(250);
  check(realtimeEvents.includes("question"), "host advancing reaches the player over realtime", realtimeEvents);

  const live = await player.rpc("get_live_state", { p_quiz_id: IDS.liveQuiz });
  check(live.data?.question && live.data.correct_index === undefined, "player gets the question without the answer");
  const answer = await player.rpc("submit_answer", {
    p_quiz_id: IDS.liveQuiz,
    p_question_id: live.data.question.id,
    p_choice: correct0,
  });
  check(
    answer.data?.accepted && answer.data.correct === undefined,
    "answer accepted without leaking correctness",
    answer.error?.message,
  );
  const hostView = await admin.rpc("get_live_state", { p_quiz_id: IDS.liveQuiz });
  check(hostView.data?.answered === 1 && Array.isArray(hostView.data.distribution), "host sees answered count + distribution");
  await admin.rpc("host_quiz_action", { p_quiz_id: IDS.liveQuiz, p_action: "reveal" });
  const revealed = await player.rpc("get_live_state", { p_quiz_id: IDS.liveQuiz });
  check(
    revealed.data?.my_response?.is_correct === true && revealed.data.my_response.points > 900,
    "reveal shows correctness and speed points",
  );
  const ended = await admin.rpc("host_quiz_action", { p_quiz_id: IDS.liveQuiz, p_action: "end" });
  check(ended.data?.status === "ended", "host ends the quiz");
  const board = await anon.rpc("get_leaderboard", { p_quiz_id: IDS.liveQuiz, p_limit: 10 });
  check(
    board.data?.[0]?.display_name === "Smoke player" && board.data[0].rank === 1,
    "leaderboard ranks the player first (anon view)",
  );
  const reviewItems = await player.rpc("get_quiz_review", { p_quiz_id: IDS.liveQuiz });
  check(reviewItems.data?.[0]?.correct_index === correct0, "answer review unlocks after the quiz ends");
  const results = await player.rpc("my_quiz_results");
  check(
    results.data?.some((r) => r.quiz_id === IDS.liveQuiz && Number(r.rank) === 1),
    "profile quiz results show rank #1",
  );
  if (channel) await player.removeChannel(channel);

  console.log("\n== self-paced quiz");
  await admin.rpc("host_quiz_action", { p_quiz_id: IDS.selfQuiz, p_action: "reset" });
  await player.rpc("join_quiz", { p_quiz_id: IDS.selfQuiz });
  const q1 = await player.rpc("next_question", { p_quiz_id: IDS.selfQuiz });
  const q1again = await player.rpc("next_question", { p_quiz_id: IDS.selfQuiz });
  check(q1.data?.index === 0 && q1again.data?.started_at === q1.data?.started_at, "question timer survives a reload");
  const sp = await player.rpc("submit_answer", { p_quiz_id: IDS.selfQuiz, p_question_id: q1.data.question.id, p_choice: 0 });
  check(typeof sp.data?.correct === "boolean", "self-paced answers get instant feedback", sp.error?.message);
  const q2 = await player.rpc("next_question", { p_quiz_id: IDS.selfQuiz });
  check(q2.data?.index === 1, "advances to the next question");
  expectError(
    await player.rpc("get_quiz_review", { p_quiz_id: IDS.selfQuiz }),
    "after the quiz ends",
    "review stays locked while open",
  );

  console.log("\n== admin dashboard queries");
  const overview = await admin.rpc("admin_overview");
  check(
    overview.data?.recent_events?.length > 0 && typeof overview.data.members === "number",
    "admin_overview analytics",
    overview.error?.message,
  );
  expectError(await player.rpc("admin_overview"), "Only admins", "analytics hidden from members");
  const quizList = await admin.rpc("admin_quiz_list");
  check(
    quizList.data?.find((q) => q.id === IDS.liveQuiz)?.question_count === 8,
    "admin quiz list with counts",
    quizList.error?.message,
  );
  const search = await admin
    .from("profiles")
    .select("*", { count: "exact" })
    .or(`full_name.ilike.%Smoke%,email.ilike.%Smoke%`)
    .range(0, 24);
  check(search.count >= 3, "member search with or() + count", search.error?.message);
  const award = await admin
    .from("user_badges")
    .insert({ user_id: users.player.id, badge_slug: "core-team", awarded_by: users.admin.id });
  check(!award.error, "admin awards a badge manually", award.error?.message);
  const newEvent = await admin
    .from("events")
    .insert({
      slug: `smoke-${stamp}`,
      title: "Smoke Event",
      summary: "x",
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      tags: ["smoke"],
    })
    .select("id, created_by")
    .single();
  check(
    newEvent.data?.created_by === users.admin.id,
    "admin creates an event (created_by defaults to them)",
    newEvent.error?.message,
  );
  if (newEvent.data) await admin.from("events").delete().eq("id", newEvent.data.id);
  const blocked = await player
    .from("events")
    .insert({ slug: `nope-${stamp}`, title: "x", summary: "x", starts_at: new Date().toISOString() });
  check(Boolean(blocked.error), "members cannot create events");
} catch (error) {
  failures.push(`crashed: ${error.message}`);
  console.error(error);
} finally {
  console.log("\n== cleanup");
  // host_quiz_action needs an admin session; reset quizzes directly with the service role instead
  await service.from("quiz_attempts").delete().in("quiz_id", [IDS.liveQuiz, IDS.selfQuiz]);
  await service
    .from("quizzes")
    .update({ status: "published", phase: "lobby", current_index: -1, question_started_at: null })
    .in("id", [IDS.liveQuiz, IDS.selfQuiz]);
  for (const u of Object.values(users)) {
    if (u.id) await service.auth.admin.deleteUser(u.id);
  }
  if (users.player.id)
    await service.storage.from("submissions").remove([`${IDS.hackathon}/${users.player.id}/${stamp}-demo.txt`]);
  if (originalSettings) {
    await service
      .from("app_settings")
      .update({
        allowed_domains: originalSettings.allowed_domains,
        restrict_signups: originalSettings.restrict_signups,
        auto_member_for_domains: originalSettings.auto_member_for_domains,
      })
      .eq("id", true);
  }
  console.log("  removed test users, attempts and files");
  console.log(`\n${failures.length ? "FAILED" : "PASSED"}: ${passed} checks passed, ${failures.length} failed`);
  if (failures.length) console.log(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(failures.length ? 1 : 0);
}
