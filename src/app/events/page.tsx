import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { getEvents, getEventSeats, partitionEvents } from "@/lib/data/public";
import type { EventCategory } from "@/lib/types";
import { cn, timeZoneLabel } from "@/lib/utils";
import { EmptyState } from "@/components/ui/feedback";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { EventTimeline } from "@/components/events/event-timeline";
import { EventsTabs } from "@/components/events/events-tabs";

export const metadata: Metadata = {
  title: "Events",
  description: "Workshops, CTFs, hackathons, talks and quiz nights by ISSA. Register and get your QR ticket instantly.",
};

const categories: { id: EventCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "workshop", label: "Workshops" },
  { id: "hackathon", label: "Hackathons" },
  { id: "ctf", label: "CTFs" },
  { id: "talk", label: "Talks" },
  { id: "competition", label: "Competitions" },
  { id: "meetup", label: "Meetups" },
];

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const { category: raw } = await searchParams;
  const category = categories.some((c) => c.id === raw) ? (raw as EventCategory) : "all";

  const events = await getEvents();
  const filtered = category === "all" ? events : events.filter((e) => e.category === category);
  const { upcoming, past } = partitionEvents(filtered);
  const seats = await getEventSeats(upcoming.map((e) => e.id));

  return (
    <Container className="max-w-5xl py-14 sm:py-20">
      <SectionHeading
        as="h1"
        kicker="Events"
        title="Learn, compete, build"
        description={`Every event is free for students. Times are shown in ${timeZoneLabel()}.`}
      />

      <nav aria-label="Filter by category" className="mb-8 flex flex-wrap gap-2">
        {categories.map((c) => {
          const active = c.id === category;
          return (
            <Link
              key={c.id}
              href={c.id === "all" ? "/events" : `/events?category=${c.id}`}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      <EventsTabs
        idPrefix="events-page"
        upcomingCount={upcoming.length}
        pastCount={past.length}
        upcoming={
          upcoming.length ? (
            <EventTimeline events={upcoming} seats={seats} />
          ) : (
            <EmptyState
              icon={<CalendarX2 className="size-5" />}
              title="Nothing scheduled here yet"
              description="Try another category, or check back soon — new events are announced regularly."
            />
          )
        }
        past={
          past.length ? (
            <EventTimeline events={past} seats={seats} past />
          ) : (
            <EmptyState title="No past events in this category" />
          )
        }
      />
    </Container>
  );
}
