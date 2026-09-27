import { Clock, Globe, Lock, MapPin, Users } from "lucide-react";
import type { ClubEvent, EventCategory } from "@/lib/types";
import { cn, formatDay, formatEventWhen, formatMonth, formatWeekday } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const categoryTone: Record<EventCategory, BadgeTone> = {
  workshop: "primary",
  hackathon: "accent",
  ctf: "danger",
  talk: "cyan",
  competition: "warning",
  meetup: "success",
  other: "neutral",
};

export function CategoryBadge({ category }: { category: EventCategory }) {
  return <Badge tone={categoryTone[category]}>{category === "ctf" ? "CTF" : category}</Badge>;
}

export function DateBlock({ iso, className }: { iso: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-16 shrink-0 flex-col items-center rounded-xl border border-line bg-surface-2 py-2 text-center",
        className,
      )}
    >
      <span className="font-mono text-[0.65rem] tracking-[0.2em] text-primary">{formatMonth(iso)}</span>
      <span className="font-display text-2xl leading-tight font-bold text-ink">{formatDay(iso)}</span>
      <span className="font-mono text-[0.6rem] text-faint uppercase">{formatWeekday(iso).slice(0, 3)}</span>
    </div>
  );
}

export function seatsLeft(event: Pick<ClubEvent, "capacity">, registered: number | undefined) {
  if (!event.capacity || registered === undefined) return null;
  return Math.max(0, event.capacity - registered);
}

export function EventMeta({ event, registered, className }: { event: ClubEvent; registered?: number; className?: string }) {
  const left = seatsLeft(event, registered);
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted", className)}>
      <li className="flex items-center gap-1.5">
        <Clock className="size-4 text-faint" aria-hidden />
        <span>{formatEventWhen(event.starts_at, event.ends_at)}</span>
      </li>
      {event.location ? (
        <li className="flex items-center gap-1.5">
          {event.mode === "online" ? (
            <Globe className="size-4 text-faint" aria-hidden />
          ) : (
            <MapPin className="size-4 text-faint" aria-hidden />
          )}
          <span>
            {event.location}
            {event.mode !== "offline" ? <span className="text-faint"> · {event.mode}</span> : null}
          </span>
        </li>
      ) : null}
      {event.capacity ? (
        <li className="flex items-center gap-1.5">
          <Users className="size-4 text-faint" aria-hidden />
          {left === null ? (
            <span>{event.capacity} seats</span>
          ) : left === 0 ? (
            <span className="text-danger">Fully booked</span>
          ) : (
            <span>
              <span className={cn(left <= Math.max(5, event.capacity * 0.1) && "font-medium text-warning")}>{left}</span> of{" "}
              {event.capacity} seats left
            </span>
          )}
        </li>
      ) : null}
      {event.members_only ? (
        <li className="flex items-center gap-1.5 text-accent">
          <Lock className="size-4" aria-hidden /> Members only
        </li>
      ) : null}
    </ul>
  );
}
