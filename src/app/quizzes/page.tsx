import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, ListOrdered, Radio, Timer, Trophy, Users } from "lucide-react";
import { rules } from "@/content/club";
import { getQuizCatalog, type QuizSummary } from "@/lib/data/public";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { Container, SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Quizzes",
  description: "Live, Kahoot-style quiz nights and self-paced practice quizzes with real-time leaderboards.",
};

export const revalidate = 30;

function quizState(q: QuizSummary, now: number) {
  if (q.status === "ended") return { label: "Ended", tone: "neutral" as const, live: false };
  if (q.mode === "live") {
    return q.phase === "lobby"
      ? { label: "Lobby open", tone: "warning" as const, live: true }
      : { label: "Live now", tone: "danger" as const, live: true };
  }
  if (q.opens_at && Date.parse(q.opens_at) > now)
    return { label: `Opens ${formatDate(q.opens_at)}`, tone: "cyan" as const, live: false };
  if (q.closes_at && Date.parse(q.closes_at) < now) return { label: "Closed", tone: "neutral" as const, live: false };
  return { label: "Open", tone: "primary" as const, live: true };
}

function QuizCard({ quiz, now }: { quiz: QuizSummary; now: number }) {
  const state = quizState(quiz, now);
  return (
    <li>
      <Link href={`/quizzes/${quiz.id}`} className="group flex h-full flex-col card card-hover p-6">
        <div className="flex items-center justify-between gap-3">
          <Badge tone={state.tone} dot pulse={state.live}>
            {state.label}
          </Badge>
          <span className="flex items-center gap-1.5 font-mono text-xs text-faint">
            {quiz.mode === "live" ? <Radio className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
            {quiz.mode === "live" ? "hosted live" : "self-paced"}
          </span>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-ink group-hover:text-primary">{quiz.title}</h2>
        {quiz.description ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{quiz.description}</p> : null}
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-1.5">
            <ListOrdered className="size-4 text-faint" aria-hidden /> {quiz.question_count} questions
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-4 text-faint" aria-hidden /> {quiz.participant_count} players
          </li>
          {quiz.closes_at && quiz.status !== "ended" ? (
            <li className="flex items-center gap-1.5">
              <Timer className="size-4 text-faint" aria-hidden /> closes {formatDate(quiz.closes_at)}
            </li>
          ) : null}
          {quiz.members_only ? <li className="text-accent">Members only</li> : null}
        </ul>
        <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-primary">
          {quiz.status === "ended" ? (
            <>
              <Trophy className="size-4" aria-hidden /> View results
            </>
          ) : (
            <>
              Play <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

export default async function QuizzesPage() {
  const quizzes = await getQuizCatalog();
  // eslint-disable-next-line react-hooks/purity -- server component rendered per revalidation window
  const now = Date.now();
  const active = quizzes.filter((q) => q.status !== "ended");
  const ended = quizzes.filter((q) => q.status === "ended");

  return (
    <Container className="py-14 sm:py-20">
      <SectionHeading
        as="h1"
        kicker="Quizzes"
        title="Test your skills, climb the leaderboard"
        description="Live quizzes are hosted on the big screen at events; practice quizzes are open any time. Faster correct answers score more."
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          {active.length ? (
            <ul className="grid gap-5 md:grid-cols-2">
              {active.map((q) => (
                <QuizCard key={q.id} quiz={q} now={now} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Trophy className="size-5" />}
              title="No quizzes running right now"
              description="The next quiz will show up here. Past results are below."
            />
          )}
          {ended.length ? (
            <section aria-labelledby="past-quizzes">
              <h2 id="past-quizzes" className="mb-4 font-mono text-xs tracking-[0.2em] text-faint uppercase">
                Past quizzes
              </h2>
              <ul className="grid gap-5 md:grid-cols-2">
                {ended.map((q) => (
                  <QuizCard key={q.id} quiz={q} now={now} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside aria-labelledby="quiz-rules" className="h-fit card p-6">
          <h2 id="quiz-rules" className="font-display text-lg font-semibold text-ink">
            How scoring works
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            {rules.quizzes.map((rule) => (
              <li key={rule} className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Container>
  );
}
