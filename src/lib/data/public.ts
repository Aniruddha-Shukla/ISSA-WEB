import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabasePublicClient } from "@/lib/supabase/server";
import type { Achievement, ClubEvent, GalleryItem, LearningResource, Project, Quiz, TeamMember } from "@/lib/types";
import { hashString } from "@/lib/utils";
import * as demo from "./demo";

/**
 * Public, cacheable reads. Everything here runs as the anonymous role, so it
 * is safe inside ISR pages. With no Supabase configured it serves demo
 * content; with Supabase configured, errors surface as empty states rather
 * than silently showing fake data.
 */

type QueryResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

async function load<T>(label: string, run: (sb: SupabaseClient) => QueryResult<T>, fallback: () => T, empty: T) {
  if (!isSupabaseConfigured) return fallback();
  try {
    const { data, error } = await run(getSupabasePublicClient());
    if (error) {
      console.error(`[data] ${label}: ${error.message}`);
      return empty;
    }
    return data ?? empty;
  } catch (err) {
    console.error(`[data] ${label}:`, err);
    return empty;
  }
}

export type QuizSummary = Pick<
  Quiz,
  "id" | "title" | "description" | "event_id" | "mode" | "status" | "phase" | "opens_at" | "closes_at" | "members_only"
> & { question_count: number; participant_count: number };

export interface PublicStats {
  members: number;
  events: number;
  projects: number;
  achievements: number;
  quiz_players: number;
}

export const getTeam = cache(() =>
  load<TeamMember[]>(
    "team",
    (sb) => sb.from("team_members").select("*").eq("is_published", true).order("sort_order").order("name"),
    demo.demoTeam,
    [],
  ),
);

export const getProjects = cache(() =>
  load<Project[]>(
    "projects",
    (sb) =>
      sb.from("projects").select("*").eq("is_published", true).order("is_featured", { ascending: false }).order("sort_order"),
    demo.demoProjects,
    [],
  ),
);

export const getAchievements = cache(() =>
  load<Achievement[]>(
    "achievements",
    (sb) =>
      sb.from("achievements").select("*").eq("is_published", true).order("achieved_on", { ascending: false, nullsFirst: false }),
    () => demo.demoAchievements().sort((a, b) => (b.achieved_on ?? "").localeCompare(a.achieved_on ?? "")),
    [],
  ),
);

export const getGallery = cache(() =>
  load<GalleryItem[]>(
    "gallery",
    (sb) =>
      sb
        .from("gallery_items")
        .select("*")
        .eq("is_published", true)
        .order("sort_order")
        .order("taken_on", { ascending: false, nullsFirst: false }),
    demo.demoGallery,
    [],
  ),
);

export const getEvents = cache(() =>
  load<ClubEvent[]>(
    "events",
    (sb) => sb.from("events").select("*").eq("is_published", true).order("starts_at"),
    () => demo.demoEvents().sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [],
  ),
);

export const getEventBySlug = cache(async (slug: string) => {
  const events = await load<ClubEvent[]>(
    `event:${slug}`,
    (sb) => sb.from("events").select("*").eq("is_published", true).eq("slug", slug).limit(1),
    () => demo.demoEvents().filter((e) => e.slug === slug),
    [],
  );
  return events[0] ?? null;
});

export const getEventById = cache(async (id: string) => {
  const events = await load<ClubEvent[]>(
    `event:${id}`,
    (sb) => sb.from("events").select("*").eq("is_published", true).eq("id", id).limit(1),
    () => demo.demoEvents().filter((e) => e.id === id),
    [],
  );
  return events[0] ?? null;
});

export const getLearningResources = cache(() =>
  load<LearningResource[]>(
    "learning",
    (sb) => sb.from("learning_resources").select("*").eq("is_published", true).order("track").order("sort_order").order("title"),
    () => demo.demoLearning().sort((a, b) => a.track.localeCompare(b.track) || a.sort_order - b.sort_order),
    [],
  ),
);

export const getQuizCatalog = cache(() =>
  load<QuizSummary[]>(
    "quiz_catalog",
    (sb) => sb.rpc("quiz_catalog"),
    () => demo.demoQuizzes().map((q) => ({ ...q, participant_count: 0 })),
    [],
  ),
);

export const getQuizSummary = cache(async (id: string) => {
  const quizzes = await getQuizCatalog();
  return quizzes.find((q) => q.id === id) ?? null;
});

export const getPublicStats = cache(() =>
  load<PublicStats>(
    "public_stats",
    (sb) => sb.rpc("public_stats"),
    () => ({
      members: 240,
      events: 3,
      projects: demo.demoProjects().length,
      achievements: demo.demoAchievements().length,
      quiz_players: 180,
    }),
    { members: 0, events: 0, projects: 0, achievements: 0, quiz_players: 0 },
  ),
);

/** Seats taken per event id (registrations are private; counts come from an RPC). */
export async function getEventSeats(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const rows = await load<{ event_id: string; registered: number }[]>(
    "event_seats",
    (sb) => sb.rpc("get_event_seats", { p_event_ids: ids }),
    // demo mode: stable pseudo-random counts per event
    () => ids.map((id) => ({ event_id: id, registered: 18 + (hashString(id) % 60) })),
    [],
  );
  return Object.fromEntries(rows.map((r) => [r.event_id, r.registered]));
}

/** True once an event has finished (or started, if it has no end time). */
export function isEventOver(event: Pick<ClubEvent, "starts_at" | "ends_at">, now = Date.now()) {
  return new Date(event.ends_at ?? event.starts_at).getTime() < now;
}

/** Split into upcoming (soonest first) and past (most recent first). */
export function partitionEvents(events: ClubEvent[], now = Date.now()) {
  const upcoming: ClubEvent[] = [];
  const past: ClubEvent[] = [];
  for (const event of events) {
    const end = new Date(event.ends_at ?? event.starts_at).getTime();
    (end >= now ? upcoming : past).push(event);
  }
  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  past.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { upcoming, past };
}
