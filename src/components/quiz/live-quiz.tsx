"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleX, Hourglass, LogIn, Radio, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { QuizSummary } from "@/lib/data/public";
import type { LiveState } from "@/lib/types";
import { errorMessage, pluralize } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { CountdownRing } from "./countdown-ring";
import { Leaderboard, useLeaderboard } from "./leaderboard";
import { OptionGrid, type OptionState } from "./option-grid";
import { QuizReview } from "./quiz-review";
import { localDeadline, useCountdown } from "./use-countdown";
import { useQuizRealtime } from "./use-quiz-realtime";

/**
 * Players who join while the room has at most this many people get instant Realtime
 * pushes; everyone after that follows along with the fast quiz-row probe instead.
 * This keeps a 200-person quiz inside the Supabase free plan (200 concurrent
 * connections, 100 messages/second — each host action sends one message per subscriber).
 */
const REALTIME_PLAYER_CAP = 80;

/** ±20% jitter so a room full of phones doesn't poll in lockstep. */
const jitter = (ms: number) => ms * (0.8 + Math.random() * 0.4);

export function LiveQuiz({ quiz }: { quiz: QuizSummary }) {
  const { user } = useAuth();
  const toast = useToast();
  const pathname = usePathname();

  const [state, setState] = useState<LiveState | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ questionId: string; index: number } | null>(null);
  const questionRef = useRef<string | null>(null);
  const phaseRef = useRef<string | null>(null);
  const rowKeyRef = useRef("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const pushDecidedRef = useRef(false);
  const connectedRef = useRef(false);

  const { rows, refresh: refreshBoard } = useLeaderboard(quiz.id, 50);
  const remaining = useCountdown(deadline);

  const fetchState = useCallback(async () => {
    const { data, error } = await getSupabaseBrowserClient().rpc("get_live_state", { p_quiz_id: quiz.id });
    const receivedAt = performance.now();
    if (error || !data) return;
    const next = data as LiveState;
    phaseRef.current = next.status === "ended" ? "ended" : next.phase;
    rowKeyRef.current = `${next.status}:${next.phase}:${next.index}`;
    // Decide once, on the first state after joining: early joiners get live pushes.
    if (!pushDecidedRef.current && next.me) {
      pushDecidedRef.current = true;
      setPushEnabled(next.status !== "ended" && next.participants <= REALTIME_PLAYER_CAP);
    }
    setState(next);
    if (next.status === "published" && next.phase === "question" && next.question && next.started_at) {
      // Anchor the timer once per question so polling doesn't make it jitter.
      if (questionRef.current !== next.question.id) {
        questionRef.current = next.question.id;
        setDeadline(
          localDeadline({
            startedAt: next.started_at,
            serverNow: next.server_now,
            timeLimit: next.question.time_limit,
            receivedAt,
          }),
        );
      }
    } else {
      questionRef.current = null;
      setDeadline(null);
    }
  }, [quiz.id]);

  // Join (idempotent) when signed in, then load the current state.
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (user) {
        const { error } = await getSupabaseBrowserClient().rpc("join_quiz", { p_quiz_id: quiz.id });
        if (!active) return;
        setJoinError(error ? errorMessage(error) : null);
      }
      await fetchState();
    };
    void run();
    return () => {
      active = false;
    };
  }, [user, quiz.id, fetchState]);

  const connected = useQuizRealtime(quiz.id, {
    onQuizChange: () => void fetchState(),
    // Only the lobby shows a live player list; scores are fetched when the answer is
    // revealed (below), so 200 phones aren't all polling the leaderboard mid-question.
    onAttemptsChange: () => {
      if (phaseRef.current !== "lobby") return;
      void fetchState();
      void refreshBoard();
    },
    pollMs: 30000,
    attemptsPollMs: 8000,
    realtime: pushEnabled,
  });
  useEffect(() => {
    connectedRef.current = connected;
  });

  // The quiz-row probe: each phone re-reads just the quiz row — a primary-key lookup —
  // and loads the full state only when something changed. Phones without a live push
  // channel probe every ~1.5s while waiting for the next question (3s mid-question), so
  // nobody falls more than ~2s behind; with a channel it is only a slow safety net in
  // case a push is dropped.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const probe = async () => {
      const { data } = await getSupabaseBrowserClient()
        .from("quizzes")
        .select("status, phase, current_index")
        .eq("id", quiz.id)
        .maybeSingle();
      if (stopped) return;
      if (data) {
        const key = `${data.status}:${data.phase}:${data.current_index}`;
        if (key !== rowKeyRef.current) await fetchState();
        if (data.status === "ended") return; // nothing left to wait for
      }
      const waitingForQuestion = phaseRef.current === "lobby" || phaseRef.current === "reveal";
      const live = connectedRef.current;
      timer = setTimeout(probe, jitter(waitingForQuestion ? (live ? 4000 : 1500) : live ? 6000 : 3000));
    };
    timer = setTimeout(probe, jitter(2000));
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [quiz.id, fetchState]);

  const phaseKey = state ? `${state.status}:${state.phase}:${state.index}` : "";
  useEffect(() => {
    if (phaseKey.includes("reveal") || phaseKey.startsWith("ended")) void refreshBoard();
  }, [phaseKey, refreshBoard]);

  async function answer(index: number) {
    if (!state?.question || state.phase !== "question" || state.my_response || remaining === 0) return;
    if (pending && pending.questionId === state.question.id) return;
    const questionId = state.question.id;
    setPending({ questionId, index });
    const { error } = await getSupabaseBrowserClient().rpc("submit_answer", {
      p_quiz_id: quiz.id,
      p_question_id: questionId,
      p_choice: index,
    });
    if (error) {
      toast.error("Answer not recorded", errorMessage(error));
      setPending(null);
    }
    await fetchState();
  }

  if (!state) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const joined = Boolean(state.me);
  const question = state.question;
  const myPick =
    state.my_response?.selected_index ?? (pending && question && pending.questionId === question.id ? pending.index : null);
  const timeUp = remaining === 0;

  const optionState = (index: number): OptionState => {
    if (state.phase === "reveal") {
      if (index === state.correct_index) return "correct";
      if (index === myPick) return "wrong";
      return "dimmed";
    }
    if (myPick === null || myPick === undefined) return "idle";
    return index === myPick ? "selected" : "dimmed";
  };

  const header = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3 text-muted">
        <span className="flex items-center gap-1.5">
          <Users className="size-4 text-faint" aria-hidden /> {pluralize(state.participants, "player")}
        </span>
        {state.me ? (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-primary">
            {state.me.score.toLocaleString("en-IN")} pts
          </span>
        ) : null}
      </div>
      {/* phones on the fast probe are in sync too; only a push channel that dropped is "syncing" */}
      <span
        className="flex items-center gap-1.5 font-mono text-xs text-faint"
        title={connected ? "Realtime connected" : pushEnabled ? "Reconnecting — polling for updates" : "Polling for updates"}
      >
        <span
          className={!pushEnabled || connected ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-warning"}
          aria-hidden
        />
        {!pushEnabled || connected ? "live" : "syncing"}
      </span>
    </div>
  );

  const signInPrompt = !user ? (
    <Notice
      className="mb-6"
      title="You're watching as a spectator"
      action={
        <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} size="sm">
          <LogIn className="size-4" aria-hidden /> Sign in to play
        </ButtonLink>
      }
    >
      Sign in to join the lobby and answer questions.
    </Notice>
  ) : joinError && !joined ? (
    <Notice className="mb-6" tone="warning" title="You can't join this quiz">
      {joinError}
    </Notice>
  ) : null;

  // ---------------------------------------------------------------- ended
  if (state.status === "ended") {
    const me = rows?.find((r) => r.is_me);
    return (
      <div className="space-y-10">
        {header}
        <section className="relative overflow-hidden card p-6 text-center sm:p-10">
          <div className="absolute inset-0 -z-0 bg-gradient-to-b from-warning/10 to-transparent" aria-hidden />
          <p className="relative font-mono text-xs tracking-[0.2em] text-warning uppercase">Final results</p>
          {me ? (
            <>
              <p className="relative mt-3 font-display text-5xl font-bold text-ink">#{me.rank}</p>
              <p className="relative mt-2 text-muted">
                {me.score.toLocaleString("en-IN")} points · {me.correct_count} of {state.total} correct
              </p>
            </>
          ) : (
            <p className="relative mt-3 font-display text-2xl font-semibold text-ink">This quiz has ended</p>
          )}
        </section>
        <Leaderboard rows={rows} title="Final leaderboard" />
        {joined ? <QuizReview quizId={quiz.id} /> : null}
      </div>
    );
  }

  // ---------------------------------------------------------------- lobby
  if (state.phase === "lobby" || !question) {
    return (
      <div>
        {header}
        {signInPrompt}
        <section className="relative flex flex-col items-center overflow-hidden card px-6 py-16 text-center">
          <div className="relative flex size-28 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-primary/30" />
            <span className="absolute inset-4 animate-pulse-ring rounded-full border border-primary/40 [animation-delay:600ms]" />
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Radio className="size-7" />
            </span>
          </div>
          <h2 className="mt-8 text-2xl font-semibold text-ink">
            {joined ? "You're in! Waiting for the host…" : "Lobby is open"}
          </h2>
          <p className="mt-3 max-w-md text-muted" aria-live="polite">
            {pluralize(state.participants, "player")} in the lobby. Questions appear here automatically when the host starts —
            keep this tab open.
          </p>
          <p className="mt-6 font-mono text-xs text-faint">
            {state.total} questions · answer fast for more points · keys 1–4 work too
          </p>
        </section>
        <Leaderboard rows={rows} compact max={10} title="Players" className="mt-8" />
      </div>
    );
  }

  // ---------------------------------------------------------------- question / reveal
  const revealed = state.phase === "reveal";
  const answered = myPick !== null && myPick !== undefined;

  return (
    <div>
      {header}
      {signInPrompt}
      <AnimatePresence mode="wait">
        <motion.section
          key={`${question.id}-${state.phase}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          aria-labelledby="question-prompt"
          className="space-y-6"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
                Question {state.index + 1} of {state.total} · {question.points} pts
              </p>
              <h2 id="question-prompt" className="mt-3 text-2xl leading-snug font-semibold text-ink sm:text-3xl">
                {question.prompt}
              </h2>
            </div>
            {!revealed ? <CountdownRing remainingMs={remaining} totalSeconds={question.time_limit} /> : null}
          </div>

          {question.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- quiz images are admin-provided URLs
            <img src={question.image_url} alt="" className="max-h-72 rounded-xl border border-line object-contain" />
          ) : null}

          <OptionGrid
            options={question.options}
            onSelect={answer}
            disabled={!joined || revealed || answered || timeUp}
            stateFor={optionState}
            distribution={revealed ? state.distribution : undefined}
            keyboard={joined && !revealed && !answered}
          />

          <div aria-live="polite">
            {revealed ? (
              <RevealBanner state={state} answered={answered} />
            ) : answered ? (
              <p className="flex items-center gap-2 text-sm text-primary">
                <CircleCheck className="size-4" aria-hidden /> Answer locked in — waiting for the host to reveal.
              </p>
            ) : timeUp ? (
              <p className="flex items-center gap-2 text-sm text-warning">
                <Hourglass className="size-4" aria-hidden /> Time&apos;s up! Waiting for the host…
              </p>
            ) : state.answered !== undefined ? (
              <p className="text-sm text-faint">
                {state.answered} of {state.participants} answered
              </p>
            ) : null}
          </div>

          {revealed ? <Leaderboard rows={rows} compact max={5} title="Top players" /> : null}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function RevealBanner({ state, answered }: { state: LiveState; answered: boolean }) {
  const correct = state.my_response?.is_correct;
  return (
    <div className="space-y-3">
      {!state.me ? null : !answered ? (
        <p className="flex items-center gap-2 font-medium text-muted">
          <Hourglass className="size-5" aria-hidden /> No answer this round.
        </p>
      ) : correct ? (
        <motion.p
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 text-lg font-semibold text-success"
        >
          <CircleCheck className="size-6" aria-hidden /> Correct! +{state.my_response?.points ?? 0} points
        </motion.p>
      ) : (
        <p className="flex items-center gap-2 text-lg font-semibold text-danger">
          <CircleX className="size-6" aria-hidden /> Not quite — 0 points this round.
        </p>
      )}
      {state.explanation ? (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">{state.explanation}</p>
      ) : null}
    </div>
  );
}
