import { ArrowRight, CalendarX2 } from "lucide-react";
import type { ClubEvent } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { EventTimeline } from "@/components/events/event-timeline";
import { EventsTabs } from "@/components/events/events-tabs";

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
    <section id="events" aria-labelledby="events-title" className="relative py-24 sm:py-28">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-full bg-gradient-to-b from-transparent via-accent/[0.03] to-transparent"
        aria-hidden
      />
      <Container className="max-w-5xl">
        <SectionHeading
          id="events-title"
          kicker="04 — Events"
          title="Workshops, CTFs & hackathons"
          description="Register in one click, get a QR ticket instantly, and check in at the venue."
          action={
            <ButtonLink href="/events" variant="outline">
              All events <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <EventsTabs
          idPrefix="home-events"
          upcomingCount={upcoming.length}
          pastCount={past.length}
          upcoming={
            upcoming.length ? (
              <EventTimeline events={upcoming} seats={seats} />
            ) : (
              <EmptyState
                icon={<CalendarX2 className="size-5" />}
                title="No upcoming events yet"
                description="New events are announced here first. Check back soon!"
              />
            )
          }
          past={past.length ? <EventTimeline events={past} seats={seats} past /> : <EmptyState title="No past events yet" />}
        />
      </Container>
    </section>
  );
}
