import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Quiz } from "@/lib/types";
import { Notice } from "@/components/ui/feedback";
import { HostConsole } from "@/components/admin/host-console";

export const metadata: Metadata = { title: "Host console" };

export default async function HostPage({ params }: PageProps<"/admin/quizzes/[id]/host">) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
  const quiz = data as Quiz | null;
  if (!quiz) notFound();

  return (
    <>
      <Link href={`/admin/quizzes/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Back to builder
      </Link>
      {quiz.mode !== "live" ? (
        <Notice tone="info" title="Self-paced quizzes don't need hosting">
          Players take this quiz on their own. Use the projector leaderboard to show live standings.
        </Notice>
      ) : (
        <HostConsole quiz={quiz} />
      )}
    </>
  );
}
