"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleCheck, CircleX, Hourglass, LogIn, Play, Trophy } from "lucide-react";
import { rules } from "@/content/club";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { QuizSummary } from "@/lib/data/public";
import type { AnswerResult, LiveState, SelfPacedStep } from "@/lib/types";
import { errorMessage, formatDateTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { CountdownRing } from "./countdown-ring";
import { Leaderboard, useLeaderboard } from "./leaderboard";
import { OptionGrid, type OptionState } from "./option-grid";
import { QuizReview } from "./quiz-review";
import { localDeadline, useCountdown } from "./use-countdown";
import { useQuizRealtime } from "./use-quiz-realtime";

type Phase = "intro" | "playing" | "feedback" | "done";

export function SelfPacedQuiz({ quiz }: { quiz: QuizSummary }) {
  const { user } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const now = useNow();

  const [snapshot, setSnapshot] = useState<LiveState | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState<SelfPacedStep | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);

  const remaining = useCountdown(phase === "playing" ? deadline : null);
  const { rows, refresh: refreshBoard } = useLeaderboard(quiz.id, 50);
  useQuizRealtime(quiz.id, { onAttemptsChange: () => void refreshBoard(), pollMs: 10000 });

  const loadSnapshot = useCallback(async () => {
    const { data } = await getSupabaseBrowserClient().rpc("get_live_state", { p_quiz_id: quiz.id });
    if (!data) return;
    const s = data as LiveState;
    setSnapshot(s);
    if (s.me?.finished || s.status === "ended") setPhase((p) => (p === "intro" ? "done" : p));
  }, [quiz.id]);

  useEffect(() => {
    const run = async () => {
      await loadSnapshot();
    };
    void run();
  }, [loadSnapshot, user]);

  const applyStep = useCallback(
    (next: SelfPacedStep, receivedAt: number) => {
      setResult(null);
      setPicked(null);
      if (next.done || !next.question || !next.started_at) {
        setStep(null);
        setDeadline(null);
        setPhase("done");
        void loadSnapshot();
        void refreshBoard();
        return;
      }
      setStep(next);
      setDeadline(
        localDeadline({
          startedAt: next.started_at,
          serverNow: next.server_now,
          timeLimit: next.question.time_limit,
          receivedAt,
        }),
      );
      setPhase("playing");
    },
    [loadSnapshot, refreshBoard],
  );

  async function advance() {
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    try {
      if (!snapshot?.me) {
        const { error } = await supabase.rpc("join_quiz", { p_quiz_id: quiz.id });
        if (error) throw error;
      }
      const { data, error } = await supabase.rpc("next_question", { p_quiz_id: quiz.id });
      const receivedAt = performance.now();
      if (error) throw error;
      applyStep(data as SelfPacedStep, receivedAt);
    } catch (error) {
      toast.error("Couldn't load the question", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function answer(index: number) {
    if (!step?.question || phase !== "playing" || picked !== null || remaining === 0) return;
    setPicked(index);
    const { data, error } = await getSupabaseBrowserClient().rpc("submit_answer", {
      p_quiz_id: quiz.id,
      p_question_id: step.question.id,
      p_choice: index,
    });
    if (error) {
      toast.error("Answer not recorded", errorMessage(error));
      setPicked(null);
      return;
    }
    setResult(data as AnswerResult);
    setPhase("feedback");
    void refreshBoard();
  }

  // Time ran out without an answer: show feedback, next_question records the timeout.
  const timedOut = phase === "playing" && remaining === 0 && picked === null;

  if (!snapshot || now === null) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const notOpenYet = quiz.opens_at ? Date.parse(quiz.opens_at) > now : false;
  const closed = snapshot.status === "ended" || (quiz.closes_at ? Date.parse(quiz.closes_at) < now : false);
  const me = rows?.find((r) => r.is_me);

  const board = (
    <aside className="h-fit card p-5" aria-labelledby="sp-board">
      <h2 id="sp-board" className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Trophy className="size-5 text-warning" aria-hidden /> Live leaderboard
      </h2>
      <Leaderboard rows={rows} compact max={10} title="Live leaderboard" />
    </aside>
  );

  let body: React.ReactNode;

  if (phase === "done") {
    body = (
      <div className="space-y-8">
        <section className="card p-8 text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
            {snapshot.me ? "Quiz complete" : "Quiz closed"}
          </p>
          {snapshot.me ? (
            <>
              <p className="mt-3 font-display text-5xl font-bold text-ink">
                {(me?.score ?? snapshot.me.score).toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-muted">
                points · {me?.correct_count ?? snapshot.me.correct_count} of {snapshot.total} correct
                {me ? ` · rank #${me.rank}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-3 text-muted">This quiz is no longer accepting players. Final standings are on the leaderboard.</p>
          )}
          {!closed && snapshot.me ? (
            <p className="mt-4 text-sm text-faint">Answers and explanations unlock when the quiz closes.</p>
          ) : null}
        </section>
        {closed && snapshot.me ? <QuizReview quizId={quiz.id} /> : null}
      </div>
    );
  } else if (phase === "intro") {
    const resuming = Boolean(snapshot.me && snapshot.me.current_index >= 0);
    body = (
      <section className="card p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-ink">{resuming ? "Welcome back" : "Before you start"}</h2>
        <ul className="mt-4 space-y-2.5 text-sm text-muted">
          {rules.quizzes.slice(2, 5).map((r) => (
            <li key={r} className="flex gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          {!user ? (
            <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} size="lg">
              <LogIn className="size-4" aria-hidden /> Sign in to play
            </ButtonLink>
          ) : notOpenYet ? (
            <Notice title="Not open yet">Opens {formatDateTime(quiz.opens_at!)}.</Notice>
          ) : closed ? (
            <Notice title="This quiz has closed" />
          ) : (
            <Button size="lg" onClick={advance} loading={busy}>
              <Play className="size-4" aria-hidden /> {resuming ? "Resume quiz" : `Start quiz · ${snapshot.total} questions`}
            </Button>
          )}
          {resuming ? (
            <p className="mt-3 text-xs text-faint">If a question was already open, its timer kept running while you were away.</p>
          ) : null}
        </div>
      </section>
    );
  } else if (step?.question) {
    const q = step.question;
    const optionState = (index: number): OptionState => {
      if (picked === null) return "idle";
      if (index !== picked) return "dimmed";
      if (phase === "feedback" && result) return result.correct ? "correct" : "wrong";
      return "selected";
    };
    body = (
      <AnimatePresence mode="wait">
        <motion.section
          key={q.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          aria-labelledby="sp-prompt"
          className="space-y-6"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
                Question {(step.index ?? 0) + 1} of {step.total} · {q.points} pts
              </p>
              <h2 id="sp-prompt" className="mt-3 text-2xl leading-snug font-semibold text-ink sm:text-3xl">
                {q.prompt}
              </h2>
            </div>
            {phase === "playing" ? <CountdownRing remainingMs={remaining} totalSeconds={q.time_limit} /> : null}
          </div>
          {q.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- quiz images are admin-provided URLs
            <img src={q.image_url} alt="" className="max-h-72 rounded-xl border border-line object-contain" />
          ) : null}
          <OptionGrid
            options={q.options}
            onSelect={answer}
            disabled={phase !== "playing" || picked !== null || timedOut}
            stateFor={optionState}
            keyboard={phase === "playing" && picked === null}
          />
          <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-4">
            {phase === "feedback" && result ? (
              result.correct ? (
                <p className="flex items-center gap-2 text-lg font-semibold text-success">
                  <CircleCheck className="size-6" aria-hidden /> Correct! +{result.points} points
                </p>
              ) : (
                <p className="flex items-center gap-2 text-lg font-semibold text-danger">
                  <CircleX className="size-6" aria-hidden /> Not this time.
                </p>
              )
            ) : timedOut ? (
              <p className="flex items-center gap-2 text-lg font-semibold text-warning">
                <Hourglass className="size-6" aria-hidden /> Time&apos;s up!
              </p>
            ) : picked !== null ? (
              <p className="text-sm text-muted">Checking…</p>
            ) : (
              <span />
            )}
            {phase === "feedback" || timedOut ? (
              <Button onClick={advance} loading={busy} autoFocus>
                {(step.index ?? 0) + 1 >= step.total ? "See results" : "Next question"}{" "}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </motion.section>
      </AnimatePresence>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0">{body}</div>
      {board}
    </div>
  );
}
