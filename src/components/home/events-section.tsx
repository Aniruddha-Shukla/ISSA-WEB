import { ArrowRight, CalendarX2 } from "lucide-react";
import type { ClubEvent } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { EventPoster } from "@/components/events/event-poster";
import { EventsTabs } from "@/components/events/events-tabs";
import { PosterRail } from "@/components/events/poster-rail";

function Posters({
  events,
  seats,
  past,
  label,
}: {
  events: ClubEvent[];
  seats: Record<string, number>;
  past?: boolean;
  label: string;
}) {
  return (
    <PosterRail label={label}>
      {events.map((event) => (
        <li key={event.id} className="w-[17rem] shrink-0 snap-start sm:w-[19rem]">
          <EventPoster event={event} registered={seats[event.id]} past={past} />
        </li>
      ))}
    </PosterRail>
  );
}

export function EventsSection({
  upcoming,
  past,
  seats,
}: {
  upcoming: ClubEvent[];
  past: ClubEvent[];
  seats: Record<string, number>;
}) {
  return (
    <section id="events" aria-labelledby="events-title" className="relative overflow-x-clip py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="events-title"
          kicker="04 · Workshops, CTFs & hackathons"
          title="Events"
          description="Register in one click, get a QR ticket instantly, and check in at the venue."
        />
        <EventsTabs
          idPrefix="home-events"
          centered
          upcomingCount={upcoming.length}
          pastCount={past.length}
          upcoming={
            upcoming.length ? (
              <Posters events={upcoming} seats={seats} label="Upcoming events" />
            ) : (
              <EmptyState
                icon={<CalendarX2 className="size-5" />}
                title="No upcoming events yet"
                description="New events are announced here first. Check back soon!"
              />
            )
          }
          past={
            past.length ? (
              <Posters events={past} seats={seats} past label="Past events" />
            ) : (
              <EmptyState title="No past events yet" />
            )
          }
        />
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/events" variant="neon" className="px-6 font-display text-[0.7rem] tracking-[0.18em] uppercase">
            All events <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
