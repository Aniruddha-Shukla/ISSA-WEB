import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import type { ClubEvent } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { CategoryBadge, DateBlock, EventMeta, seatsLeft } from "./event-bits";

/** Vertical timeline of events. Server component. */
export function EventTimeline({ events, seats, past }: { events: ClubEvent[]; seats: Record<string, number>; past?: boolean }) {
  return (
    <ol className="relative space-y-5 before:absolute before:top-4 before:bottom-4 before:left-8 before:w-px before:bg-gradient-to-b before:from-primary/40 before:via-line-strong before:to-transparent">
      {events.map((event) => {
        const left = seatsLeft(event, seats[event.id]);
        const full = left === 0;
        const canRegister = !past && event.registration_open && !full;
        return (
          <li key={event.id} className="relative flex gap-5">
            <DateBlock iso={event.starts_at} className="relative z-10" />
            <article className="group relative flex-1 card card-hover p-5 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-primary sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={event.category} />
                {event.is_featured && !past ? (
                  <span className="font-mono text-[0.68rem] tracking-[0.18em] text-warning uppercase">★ featured</span>
                ) : null}
              </div>
              <h3 className="mt-3 text-xl font-semibold text-ink">
                <Link
                  href={`/events/${event.slug}`}
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                >
                  {event.title}
                </Link>
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{event.summary}</p>
              <EventMeta event={event} registered={seats[event.id]} className="mt-4" />
              <div className="relative z-10 mt-5 flex flex-wrap items-center gap-3">
                {past ? (
                  <Link href={`/events/${event.slug}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                    <Images className="size-4" aria-hidden /> Recap
                    <span className="sr-only"> of {event.title}</span>
                  </Link>
                ) : canRegister ? (
                  <Link href={`/events/${event.slug}#register`} className={buttonClasses({ size: "sm" })}>
                    Register <ArrowRight className="size-4" aria-hidden />
                    <span className="sr-only"> for {event.title}</span>
                  </Link>
                ) : (
                  <Link href={`/events/${event.slug}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                    {full ? "Fully booked" : "View details"}
                    <span className="sr-only"> for {event.title}</span>
                  </Link>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
