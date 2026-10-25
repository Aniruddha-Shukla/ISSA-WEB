import { ArrowRight, CalendarX2 } from "lucide-react";
import type { ClubEvent } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { EventPoster } from "@/components/events/event-poster";
import { EventTrack } from "@/components/events/event-track";

const posterItem = "w-[17rem] shrink-0 snap-start sm:w-[19rem]";

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
        {upcoming.length || past.length ? (
          // one journey: what's coming up, then what we've done
          <EventTrack label="Upcoming and past events">
            {upcoming.map((event) => (
              <li key={event.id} className={posterItem}>
                <EventPoster event={event} registered={seats[event.id]} />
              </li>
            ))}
            {past.length ? (
              <li className="flex w-28 shrink-0 snap-start flex-col items-center justify-center gap-4">
                <span className="h-24 w-px bg-gradient-to-b from-transparent to-gold/60" />
                <span className="font-display text-[0.65rem] font-semibold tracking-[0.3em] text-gold uppercase [writing-mode:vertical-rl]">
                  Past events
                </span>
                <span className="h-24 w-px bg-gradient-to-t from-transparent to-gold/60" />
              </li>
            ) : null}
            {past.map((event) => (
              <li key={event.id} className={posterItem}>
                <EventPoster event={event} registered={seats[event.id]} past />
              </li>
            ))}
          </EventTrack>
        ) : (
          <EmptyState
            icon={<CalendarX2 className="size-5" />}
            title="No events yet"
            description="New events are announced here first. Check back soon!"
          />
        )}
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/events" variant="neon" className="px-6 font-display text-[0.7rem] tracking-[0.18em] uppercase">
            All events <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
