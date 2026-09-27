import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuizBuilder } from "@/components/admin/quiz-builder";

export const metadata: Metadata = { title: "Quiz builder" };

export default async function QuizBuilderPage({ params }: PageProps<"/admin/quizzes/[id]">) {
  const { id } = await params;
  return (
    <>
      <Link href="/admin/quizzes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Quizzes
      </Link>
      <QuizBuilder quizId={id} />
    </>
  );
}
