"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, Flag, Maximize2, Play, RotateCcw, Trophy, Users } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LiveState, Quiz } from "@/lib/types";
import { errorMessage, pluralize } from "@/lib/utils";
import { useHydrated } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { CountdownRing } from "@/components/quiz/countdown-ring";
import { Leaderboard, useLeaderboard } from "@/components/quiz/leaderboard";
import { OptionGrid } from "@/components/quiz/option-grid";
import { localDeadline, useCountdown } from "@/components/quiz/use-countdown";
import { useQuizRealtime } from "@/components/quiz/use-quiz-realtime";

type Action = "next" | "reveal" | "end" | "reset";

export function HostConsole({ quiz }: { quiz: Quiz }) {
  const toast = useToast();
  const hydrated = useHydrated();
  const [state, setState] = useState<LiveState | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [autoReveal, setAutoReveal] = useState(true);
  const [showLiveVotes, setShowLiveVotes] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const questionRef = useRef<string | null>(null);
  const autoRevealedRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const remaining = useCountdown(deadline);
  const { rows, refresh: refreshBoard } = useLeaderboard(quiz.id, 50);

  const fetchState = useCallback(async () => {
    const { data, error } = await getSupabaseBrowserClient().rpc("get_live_state", { p_quiz_id: quiz.id });
    const receivedAt = performance.now();
    if (error || !data) return;
    const next = data as LiveState;
    setState(next);
    if (next.status === "published" && next.phase === "question" && next.question && next.started_at) {
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

  useEffect(() => {
    const run = async () => {
      await fetchState();
    };
    void run();
  }, [fetchState]);

  const connected = useQuizRealtime(quiz.id, {
    onQuizChange: () => void fetchState(),
    onAttemptsChange: () => {
      void fetchState();
      void refreshBoard();
    },
    pollMs: 2500,
    // One host screen: poll answer counts and scores every 2s instead of receiving
    // a push for every single answer.
    attemptsPollMs: 2000,
  });

  const act = useCallback(
    async (action: Action) => {
      setBusy(action);
      const { error } = await getSupabaseBrowserClient().rpc("host_quiz_action", { p_quiz_id: quiz.id, p_action: action });
      setBusy(null);
      setConfirmReset(false);
      if (error) {
        toast.error("Action failed", errorMessage(error));
        return;
      }
      await fetchState();
      void refreshBoard();
    },
    [quiz.id, fetchState, refreshBoard, toast],
  );

  // Auto-reveal once per question when its timer runs out.
  useEffect(() => {
    if (!autoReveal || remaining !== 0 || state?.phase !== "question" || !state.question) return;
    if (autoRevealedRef.current === state.question.id) return;
    autoRevealedRef.current = state.question.id;
    const t = setTimeout(() => void act("reveal"), 1200); // grace for last-second answers
    return () => clearTimeout(t);
  }, [autoReveal, remaining, state, act]);

  const primary = useMemo<{ label: string; action: Action; icon: typeof Play } | null>(() => {
    if (!state || state.status !== "published") return null;
    if (state.phase === "lobby") return { label: "Start quiz", action: "next", icon: Play };
    if (state.phase === "question") return { label: "Reveal answer", action: "reveal", icon: Eye };
    if (state.index + 1 >= state.total) return { label: "Show final results", action: "next", icon: Trophy };
    return { label: "Next question", action: "next", icon: ArrowRight };
  }, [state]);

  // → or N advances (Space is left alone so focused buttons behave normally).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((event.key === "ArrowRight" || event.key.toLowerCase() === "n") && primary && !busy) {
        event.preventDefault();
        void act(primary.action);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary, busy, act]);

  if (!state) return <Skeleton className="h-[32rem] w-full" />;

  const joinUrl = hydrated ? `${window.location.origin}/quizzes/${quiz.id}` : `/quizzes/${quiz.id}`;
  const q = state.question;
  const answeredPct = state.participants ? Math.round(((state.answered ?? 0) / state.participants) * 100) : 0;

  return (
    <div ref={rootRef} className="rounded-3xl border border-line bg-base p-4 sm:p-6">
      {/* control bar */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            tone={state.status === "ended" ? "neutral" : state.phase === "question" ? "danger" : "warning"}
            dot
            pulse={state.status === "published"}
          >
            {state.status === "ended" ? "ended" : state.status === "draft" ? "draft" : state.phase}
          </Badge>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Users className="size-4" aria-hidden /> {pluralize(state.participants, "player")}
          </span>
          {state.index >= 0 && state.status === "published" ? (
            <span className="font-mono text-sm text-muted">
              Q{state.index + 1}/{state.total}
            </span>
          ) : null}
          <span className="font-mono text-xs text-faint">{connected ? "● realtime" : "○ polling"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary ? (
            <Button size="lg" onClick={() => void act(primary.action)} loading={busy === primary.action}>
              <primary.icon className="size-4" aria-hidden /> {primary.label}
              <kbd className="ml-1 rounded border border-on-primary/30 px-1 font-mono text-[0.65rem]">→</kbd>
            </Button>
          ) : null}
          {state.status === "published" && state.phase !== "lobby" ? (
            <Button variant="secondary" onClick={() => void act("end")} loading={busy === "end"}>
              <Flag className="size-4" aria-hidden /> End now
            </Button>
          ) : null}
          {state.participants > 0 || state.status === "ended" ? (
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-4" aria-hidden /> Reset
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Full screen"
            onClick={() => void rootRef.current?.requestFullscreen?.()}
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      {state.status === "draft" ? (
        <Notice tone="warning" className="mt-6" title="This quiz is still a draft">
          Publish it from the{" "}
          <Link href={`/admin/quizzes/${quiz.id}`} className="underline">
            builder
          </Link>{" "}
          to open the lobby.
        </Notice>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {state.status === "ended" ? (
              <motion.section
                key="ended"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="font-mono text-sm tracking-[0.3em] text-warning uppercase">Final standings</p>
                <div className="mt-8 flex items-end justify-center gap-4">
                  {[1, 0, 2].map((i) => {
                    const row = rows?.[i];
                    if (!row) return <div key={i} className="w-28 sm:w-40" />;
                    const heights = ["h-40", "h-28", "h-20"];
                    return (
                      <motion.div
                        key={row.id}
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + (2 - i) * 0.35 }}
                        className="flex w-28 flex-col items-center sm:w-40"
                      >
                        <p className="max-w-full truncate font-semibold text-ink">{row.display_name}</p>
                        <p className="font-mono text-sm text-muted">{row.score.toLocaleString("en-IN")}</p>
                        <div
                          className={`mt-3 flex w-full items-start justify-center rounded-t-2xl border border-b-0 pt-3 font-display text-3xl font-bold ${heights[i]} ${
                            i === 0 ? "border-warning/50 bg-warning/15 text-warning" : "border-line-strong bg-surface-2 text-ink"
                          }`}
                        >
                          {i + 1}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            ) : state.phase === "lobby" || !q ? (
              <motion.section
                key="lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid items-center gap-8 md:grid-cols-[auto_1fr]"
              >
                <div className="mx-auto rounded-2xl bg-white p-4">
                  <QRCodeSVG
                    value={joinUrl}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                    title="Scan to join the quiz"
                  />
                </div>
                <div>
                  <p className="font-mono text-sm tracking-[0.25em] text-primary uppercase">Join the quiz</p>
                  <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">{quiz.title}</h2>
                  <p className="mt-4 font-mono text-lg break-all text-cyan">{joinUrl.replace(/^https?:\/\//, "")}</p>
                  <p className="mt-6 text-muted" aria-live="polite">
                    {pluralize(state.participants, "player")} waiting · {state.total} questions
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {(rows ?? []).slice(0, 40).map((r) => (
                      <motion.li
                        key={r.id}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-ink"
                      >
                        {r.display_name}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key={`${q.id}-${state.phase}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="font-mono text-sm tracking-[0.2em] text-primary uppercase">
                      Question {state.index + 1} of {state.total} · {q.points} pts
                    </p>
                    <h2 className="mt-3 text-3xl leading-tight font-semibold text-ink sm:text-4xl">{q.prompt}</h2>
                  </div>
                  {state.phase === "question" ? (
                    <CountdownRing remainingMs={remaining} totalSeconds={q.time_limit} size={120} />
                  ) : null}
                </div>
                {q.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- quiz images are admin-provided URLs
                  <img src={q.image_url} alt="" className="max-h-80 rounded-xl border border-line object-contain" />
                ) : null}
                <OptionGrid
                  options={q.options}
                  disabled
                  keyboard={false}
                  stateFor={(i) => (state.phase === "reveal" ? (i === state.correct_index ? "correct" : "dimmed") : "idle")}
                  distribution={state.phase === "reveal" || showLiveVotes ? state.distribution : undefined}
                />
                {state.phase === "question" ? (
                  <div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>
                        {state.answered ?? 0} of {state.participants} answered
                      </span>
                      <span className="font-mono">{answeredPct}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-cyan"
                        animate={{ width: `${answeredPct}%` }}
                      />
                    </div>
                  </div>
                ) : state.explanation ? (
                  <p className="rounded-xl border border-line bg-surface-2 px-5 py-4 text-lg text-muted">{state.explanation}</p>
                ) : null}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-5">
          <div className="card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Trophy className="size-4 text-warning" aria-hidden /> Leaderboard
            </h3>
            <Leaderboard rows={rows} compact max={8} highlightMe={false} />
          </div>
          <div className="space-y-4 card p-4">
            <Switch
              id="auto-reveal"
              label="Auto-reveal"
              description="Reveal the answer when the timer ends."
              checked={autoReveal}
              onChange={setAutoReveal}
            />
            <Switch
              id="live-votes"
              label="Show live votes"
              description="Off keeps the crowd from copying."
              checked={showLiveVotes}
              onChange={setShowLiveVotes}
            />
            <Link
              href={`/quizzes/${quiz.id}/leaderboard`}
              target="_blank"
              className={buttonClasses({ variant: "ghost", size: "sm", className: "w-full" })}
            >
              Open projector leaderboard
            </Link>
          </div>
        </aside>
      </div>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset quiz?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy === "reset"} onClick={() => void act("reset")}>
              Delete attempts & reset
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          All players, answers and scores are removed and the lobby reopens. Great after a rehearsal.
        </p>
      </Dialog>
    </div>
  );
}
