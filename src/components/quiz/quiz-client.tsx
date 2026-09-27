"use client";

import { useAuth } from "@/components/providers/auth-provider";
import type { QuizSummary } from "@/lib/data/public";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { LiveQuiz } from "./live-quiz";
import { SelfPacedQuiz } from "./self-paced-quiz";

export function QuizClient({ quiz }: { quiz: QuizSummary }) {
  const { configured, loading } = useAuth();

  if (!configured) {
    return (
      <Notice tone="warning" title="Quizzes are offline in demo mode">
        Connect Supabase (see README) to play live and self-paced quizzes with realtime leaderboards.
      </Notice>
    );
  }
  if (loading) return <Skeleton className="h-72 w-full" />;
  return quiz.mode === "live" ? <LiveQuiz quiz={quiz} /> : <SelfPacedQuiz quiz={quiz} />;
}
