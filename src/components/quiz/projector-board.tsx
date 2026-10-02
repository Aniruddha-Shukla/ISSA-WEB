"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Notice } from "@/components/ui/feedback";
import { Leaderboard, useLeaderboard } from "./leaderboard";
import { useQuizRealtime } from "./use-quiz-realtime";

/** Big-screen leaderboard: realtime when signed in, polling otherwise. */
export function ProjectorBoard({ quizId }: { quizId: string }) {
  const { configured } = useAuth();
  if (!configured) return <Notice tone="warning" title="Leaderboards need the backend (demo mode)" />;
  return <Board quizId={quizId} />;
}

function Board({ quizId }: { quizId: string }) {
  const { rows, refresh } = useLeaderboard(quizId, 20);
  const connected = useQuizRealtime(quizId, {
    onAttemptsChange: () => void refresh(),
    onQuizChange: () => void refresh(),
    pollMs: 3000,
    attemptsPollMs: 3000,
  });
  return (
    <div>
      <p className="mb-4 text-right font-mono text-xs text-faint">{connected ? "● live" : "○ refreshing every few seconds"}</p>
      <Leaderboard rows={rows} highlightMe={false} className="[&_li]:py-4 [&_li_span]:text-lg" />
    </div>
  );
}
