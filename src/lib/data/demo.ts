import "server-only";

import content from "@/content/demo-content.json";
import { zonedTimeToUtc } from "@/lib/utils";
import type { Achievement, ClubEvent, GalleryItem, Project, Quiz, TeamMember } from "@/lib/types";

/**
 * Sample content for demo mode (no Supabase configured). The same JSON seeds
 * the database via scripts/generate-seed.mjs. Relative dates are resolved
 * against "now", so demo events always look current.
 */

const DAY = 86_400_000;

const daysFromToday = (days: number, hhmm: string) => zonedTimeToUtc(new Date(Date.now() + days * DAY), hhmm);

const daysAgoDate = (days: number | null | undefined) =>
  days == null ? null : new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

export function demoTeam(): TeamMember[] {
  return content.team.map((m) => ({
    id: m.id,
    name: m.name,
    designation: m.designation,
    photo_url: null,
    bio: m.bio ?? null,
    linkedin_url: m.linkedin_url ?? null,
    github_url: ("github_url" in m && m.github_url) || null,
    twitter_url: ("twitter_url" in m && m.twitter_url) || null,
    instagram_url: ("instagram_url" in m && m.instagram_url) || null,
    email: null,
    tenure: m.tenure ?? null,
    sort_order: m.sort_order,
    is_published: true,
  }));
}

export function demoProjects(): Project[] {
  return content.projects.map((p) => ({
    ...p,
    status: p.status as Project["status"],
    cover_url: null,
    is_published: true,
  }));
}

export function demoAchievements(): Achievement[] {
  return content.achievements.map((a) => ({
    id: a.id,
    title: a.title,
    recipients: a.recipients,
    category: a.category as Achievement["category"],
    position: a.position ?? null,
    description: a.description ?? null,
    achieved_on: daysAgoDate(a.achieved_days_ago),
    link_url: null,
    image_url: null,
    is_featured: a.is_featured,
    is_published: true,
  }));
}

export function demoEvents(): ClubEvent[] {
  return content.events.map((e) => {
    const start = daysFromToday(e.starts_in_days, e.start_time);
    const end = e.duration_hours ? new Date(start.getTime() + e.duration_hours * 3_600_000) : null;
    const subHours = "submission_deadline_hours_after_start" in e ? e.submission_deadline_hours_after_start : undefined;
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      summary: e.summary,
      description: e.description,
      category: e.category as ClubEvent["category"],
      cover_url: null,
      location: e.location,
      mode: e.mode as ClubEvent["mode"],
      starts_at: start.toISOString(),
      ends_at: end?.toISOString() ?? null,
      registration_deadline: null,
      capacity: e.capacity ?? null,
      registration_open: e.registration_open,
      members_only: e.members_only,
      submissions_open: e.submissions_open,
      submission_deadline: typeof subHours === "number" ? new Date(start.getTime() + subHours * 3_600_000).toISOString() : null,
      submission_guidelines: ("submission_guidelines" in e && e.submission_guidelines) || null,
      tags: e.tags,
      is_featured: e.is_featured,
      is_published: true,
    };
  });
}

export function demoGallery(): GalleryItem[] {
  return content.gallery.map((g) => ({
    id: g.id,
    title: g.title,
    media_type: g.media_type as GalleryItem["media_type"],
    url: g.url,
    thumbnail_url: null,
    caption: g.caption,
    event_id: g.event_id,
    taken_on: daysAgoDate(g.taken_days_ago),
    sort_order: g.sort_order,
    is_published: true,
  }));
}

/** Quizzes without their questions (answers never leave the server). */
export function demoQuizzes(): (Quiz & { question_count: number })[] {
  const now = Date.now();
  return content.quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    event_id: q.event_id,
    mode: q.mode as Quiz["mode"],
    status: q.status as Quiz["status"],
    phase: "lobby",
    current_index: -1,
    question_started_at: null,
    opens_at:
      "opens_in_days" in q && typeof q.opens_in_days === "number" ? new Date(now + q.opens_in_days * DAY).toISOString() : null,
    closes_at:
      "closes_in_days" in q && typeof q.closes_in_days === "number" ? new Date(now + q.closes_in_days * DAY).toISOString() : null,
    members_only: q.members_only,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    question_count: q.questions.length,
  }));
}
