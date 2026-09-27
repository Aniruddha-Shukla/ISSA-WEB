import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getQuizSummary } from "@/lib/data/public";
import { Container } from "@/components/ui/section-heading";
import { ProjectorBoard } from "@/components/quiz/projector-board";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/quizzes/[id]/leaderboard">): Promise<Metadata> {
  const { id } = await params;
  const quiz = await getQuizSummary(id);
  return { title: quiz ? `${quiz.title} — Leaderboard` : "Leaderboard" };
}

export default async function LeaderboardPage({ params }: PageProps<"/quizzes/[id]/leaderboard">) {
  const { id } = await params;
  const quiz = await getQuizSummary(id);
  if (!quiz) notFound();

  return (
    <Container className="max-w-4xl py-12">
      <header className="mb-10 text-center">
        <p className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-warning uppercase">
          <Trophy className="size-4" aria-hidden /> Live leaderboard
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{quiz.title}</h1>
      </header>
      <ProjectorBoard quizId={quiz.id} />
    </Container>
  );
}
