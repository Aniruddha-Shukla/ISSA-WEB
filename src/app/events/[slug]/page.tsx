import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Radio } from "lucide-react";
import { getEventBySlug, getEventSeats, getQuizCatalog, isEventOver } from "@/lib/data/public";
import { Badge } from "@/components/ui/badge";
import { GenerativeArt } from "@/components/ui/generative-art";
import { Markdown } from "@/components/ui/markdown";
import { Container } from "@/components/ui/section-heading";
import { SmartImage } from "@/components/ui/smart-image";
import { CategoryBadge, EventMeta } from "@/components/events/event-bits";
import { RegistrationPanel } from "@/components/events/registration-panel";
import { SubmissionPortal } from "@/components/events/submission-portal";

export const revalidate = 60;

// Pages are rendered on first visit and then cached (ISR); nothing is prebuilt.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.summary,
    openGraph: { title: event.title, description: event.summary, type: "article" },
  };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [seats, quizzes] = await Promise.all([getEventSeats([event.id]), getQuizCatalog()]);
  const relatedQuizzes = quizzes.filter((q) => q.event_id === event.id);
  const isPast = isEventOver(event);

  return (
    <Container className="py-10 sm:py-14">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> All events
      </Link>

      <header className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={event.category} />
            <Badge tone="neutral">{event.mode}</Badge>
            {event.members_only ? <Badge tone="accent">Members only</Badge> : null}
            {isPast ? <Badge tone="neutral">Past event</Badge> : null}
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{event.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{event.summary}</p>
          <EventMeta event={event} registered={seats[event.id]} className="mt-6" />
          {event.tags.length ? (
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Tags">
              {event.tags.map((tag) => (
                <li key={tag} className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-xs text-faint">
                  #{tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line">
          {event.cover_url ? (
            <SmartImage src={event.cover_url} alt="" priority sizes="(min-width: 1024px) 40vw, 100vw" />
          ) : (
            <GenerativeArt seed={event.slug} />
          )}
        </div>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="about-event" className="card p-6 sm:p-8">
            <h2 id="about-event" className="text-lg font-semibold text-ink">
              About this event
            </h2>
            <Markdown className="mt-4">{event.description || event.summary}</Markdown>
          </section>

          {event.submissions_open ? <SubmissionPortal event={event} /> : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section id="register" aria-label="Registration" className="card p-5">
            {isPast ? (
              <div>
                <p className="font-display text-lg font-semibold text-ink">This event has ended</p>
                <p className="mt-2 text-sm text-muted">Thanks to everyone who came! Photos land in the gallery.</p>
                <Link href="/gallery" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  View gallery <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <RegistrationPanel event={event} />
            )}
          </section>

          {relatedQuizzes.map((quiz) => (
            <Link key={quiz.id} href={`/quizzes/${quiz.id}`} className="group block card card-hover p-5">
              <p className="flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.2em] text-warning uppercase">
                <Radio className="size-3.5" aria-hidden /> {quiz.mode === "live" ? "Live quiz" : "Practice quiz"}
              </p>
              <p className="mt-2 font-semibold text-ink group-hover:text-primary">{quiz.title}</p>
              <p className="mt-1 text-sm text-muted">
                {quiz.question_count} questions · {quiz.status === "ended" ? "results available" : "join from your phone"}
              </p>
            </Link>
          ))}
        </aside>
      </div>
    </Container>
  );
}
