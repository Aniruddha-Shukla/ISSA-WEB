import Link from "next/link";
import type { CSSProperties } from "react";
import type { ClubEvent, EventCategory } from "@/lib/types";
import { cn, formatDate, formatEventWhen } from "@/lib/utils";
import { GenerativeArt } from "@/components/ui/generative-art";
import { SmartImage } from "@/components/ui/smart-image";
import { seatsLeft } from "./event-bits";

// Saturated poster colours; every pairing keeps title text at ≥ 5:1 contrast.
const posterTheme: Record<EventCategory, { bg: string; fg: string }> = {
  ctf: { bg: "#b91c1c", fg: "#ffffff" },
  workshop: { bg: "#facc15", fg: "#0a0a0a" },
  hackathon: { bg: "#7e22ce", fg: "#ffffff" },
  talk: { bg: "#0f766e", fg: "#ffffff" },
  competition: { bg: "#c2410c", fg: "#ffffff" },
  meetup: { bg: "#4338ca", fg: "#ffffff" },
  other: { bg: "#be185d", fg: "#ffffff" },
};

/** Tall, corner-cut event poster for the horizontal carousel. Server component. */
export function EventPoster({ event, registered, past }: { event: ClubEvent; registered?: number; past?: boolean }) {
  const theme = posterTheme[event.category] ?? posterTheme.other;
  const left = seatsLeft(event, registered);
  const full = left === 0;
  const canRegister = !past && event.registration_open && !full;
  const status = past
    ? "Completed"
    : full
      ? "Fully booked"
      : left !== null
        ? `${left} seats left`
        : (event.location ?? event.mode);

  return (
    // clip-path would also clip a focus outline, so the ring lives on an unclipped wrapper
    <div className="h-full rounded-sm has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-primary">
      <article
        className={cn(
          "group relative isolate flex h-full flex-col overflow-hidden transition-[filter,transform] duration-300 [--chamfer:26px] chamfer hover:-translate-y-1",
          past && "saturate-[0.55] hover:saturate-100",
        )}
        style={{ backgroundColor: theme.bg, color: theme.fg } as CSSProperties}
      >
        {/* repeated-title watermark */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 flex flex-col justify-center gap-1 opacity-[0.13] select-none"
          aria-hidden
        >
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="font-display text-4xl leading-none font-black whitespace-nowrap uppercase"
              style={{ transform: `translateX(${i % 2 ? -18 : -4}%)` }}
            >
              {event.title} · {event.title}
            </span>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/15 via-transparent to-black/45"
          aria-hidden
        />

        <div className="flex items-center justify-between gap-3 px-5 pt-5 font-mono text-[0.65rem] font-semibold tracking-[0.2em] uppercase">
          <span>{event.category === "ctf" ? "CTF" : event.category}</span>
          <span>{past ? "Completed" : formatDate(event.starts_at)}</span>
        </div>

        <h3
          className={cn(
            "line-clamp-3 px-5 pt-3 font-display leading-[1.05] font-black tracking-wide uppercase",
            event.title.length > 24 ? "text-[1.2rem]" : event.title.length > 14 ? "text-[1.4rem]" : "text-[1.65rem]",
          )}
        >
          <Link
            href={`/events/${event.slug}`}
            className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none"
          >
            {event.title}
          </Link>
        </h3>

        <div className="relative mx-5 mt-4 aspect-[4/3] overflow-hidden shadow-2xl [--chamfer:16px] chamfer">
          {event.cover_url ? (
            <SmartImage
              src={event.cover_url}
              alt=""
              sizes="304px"
              className="transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <GenerativeArt seed={event.title} className="transition-transform duration-500 group-hover:scale-105" />
          )}
        </div>

        <div className="mt-auto bg-black/75 px-5 pt-4 pb-5 text-white">
          <p className="font-display text-xs font-bold tracking-[0.12em] uppercase">
            {formatEventWhen(event.starts_at, event.ends_at)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-white/75">{event.summary}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className={cn("truncate font-mono text-[0.7rem] text-white/70", full && !past && "text-[#fda4af]")}>
              {status}
            </span>
            {canRegister ? (
              <Link
                href={`/events/${event.slug}#register`}
                className="relative z-20 shrink-0 rounded-full border border-white/50 px-3.5 py-1.5 font-display text-[0.6rem] font-bold tracking-[0.18em] uppercase transition-colors hover:bg-white hover:text-black"
              >
                Register<span className="sr-only"> for {event.title}</span>
              </Link>
            ) : (
              <span
                className="shrink-0 font-display text-[0.6rem] font-bold tracking-[0.18em] text-white/80 uppercase"
                aria-hidden
              >
                {past ? "Recap →" : "Details →"}
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
