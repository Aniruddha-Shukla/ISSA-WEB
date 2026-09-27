import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MonitorPlay } from "lucide-react";
import { getQuizSummary } from "@/lib/data/public";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/section-heading";
import { QuizClient } from "@/components/quiz/quiz-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/quizzes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const quiz = await getQuizSummary(id);
  return { title: quiz?.title ?? "Quiz", description: quiz?.description ?? undefined };
}

export default async function QuizPage({ params }: PageProps<"/quizzes/[id]">) {
  const { id } = await params;
  const quiz = await getQuizSummary(id);
  if (!quiz) notFound();

  return (
    <Container className="max-w-6xl py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> All quizzes
        </Link>
        <Link
          href={`/quizzes/${quiz.id}/leaderboard`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <MonitorPlay className="size-4" aria-hidden /> Projector leaderboard
        </Link>
      </div>
      <header className="mt-6 mb-8">
        <div className="flex flex-wrap gap-2">
          <Badge tone={quiz.mode === "live" ? "danger" : "primary"}>{quiz.mode === "live" ? "Live quiz" : "Self-paced"}</Badge>
          {quiz.members_only ? <Badge tone="accent">Members only</Badge> : null}
          {quiz.status === "ended" ? <Badge>Ended</Badge> : null}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{quiz.title}</h1>
        {quiz.description ? <p className="mt-3 max-w-2xl text-muted">{quiz.description}</p> : null}
      </header>
      <QuizClient quiz={quiz} />
    </Container>
  );
}
