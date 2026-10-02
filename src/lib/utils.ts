import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { siteConfig } from "@/config/site";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------- dates
// Everything is rendered in the club's timezone so server and client agree.

const tz = siteConfig.timezone;
const locale = siteConfig.locale;

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: tz, ...options });

const dateFmt = fmt({ day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = fmt({ weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const timeFmt = fmt({ hour: "numeric", minute: "2-digit" });
const monthFmt = fmt({ month: "short" });
const dayFmt = fmt({ day: "2-digit" });
const weekdayFmt = fmt({ weekday: "long" });

export const formatDate = (iso: string | Date) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string | Date) => dateTimeFmt.format(new Date(iso));
export const formatTime = (iso: string | Date) => timeFmt.format(new Date(iso));
export const formatMonth = (iso: string | Date) => monthFmt.format(new Date(iso)).toUpperCase();
export const formatDay = (iso: string | Date) => dayFmt.format(new Date(iso));
export const formatWeekday = (iso: string | Date) => weekdayFmt.format(new Date(iso));

/** "Sat, 4 Oct, 5:00 pm – 8:00 pm" (end time only when on the same day). */
export function formatEventWhen(startsAt: string, endsAt?: string | null) {
  const start = formatDateTime(startsAt);
  if (!endsAt) return start;
  const sameDay = formatDate(startsAt) === formatDate(endsAt);
  return `${start} – ${sameDay ? formatTime(endsAt) : formatDateTime(endsAt)}`;
}

export function timeZoneLabel() {
  const parts = fmt({ timeZoneName: "short" }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export function relativeTime(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return rtf.format(Math.round(diff / (30 * day)), "month");
}

/** UTC instant for a wall-clock time in the club timezone (used by demo content). */
export function zonedTimeToUtc(date: Date, hhmm: string, timeZone = tz) {
  const [h, m] = hhmm.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), h, m);
  // offset of the zone at that instant
  const probe = new Date(wallAsUtc);
  const zoned = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(probe);
  const z = (type: string) => Number(zoned.find((p) => p.type === type)?.value);
  const zonedAsUtc = Date.UTC(z("year"), z("month") - 1, z("day"), z("hour"), z("minute"), z("second"));
  const offset = zonedAsUtc - probe.getTime();
  return new Date(wallAsUtc - offset);
}

// ---------------------------------------------------------------- strings

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Deterministic 32-bit hash, used to seed generative artwork. */
/** Small seeded PRNG: the same seed always yields the same sequence (stable SSR artwork). */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isSafeHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Extract a YouTube video id from the common URL shapes. */
export function youTubeId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const match = u.pathname.match(/\/(embed|shorts|live)\/([\w-]{6,})/);
      return match?.[2] ?? null;
    }
  } catch {
    // not a URL
  }
  return null;
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string" && error.message) {
    return error.message;
  }
  return fallback;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const roleLabel: Record<string, string> = { admin: "Core Team", member: "Member", guest: "Guest" };

// ---------------------------------------------------------------- admin form helpers

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in the club timezone (for <input type="datetime-local">). */
export function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "YYYY-MM-DDTHH:mm" interpreted as wall-clock time in the club timezone -> ISO string. */
export function localInputToIso(value: string | null | undefined) {
  if (!value) return null;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  // Noon UTC of that calendar date is the same calendar date in every zone we care about.
  return zonedTimeToUtc(new Date(Date.UTC(y, m - 1, d, 12)), timePart.slice(0, 5)).toISOString();
}
