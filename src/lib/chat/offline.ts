import "server-only";

import { contact, faqs, membership, rules } from "@/content/club";
import type { QuizSummary } from "@/lib/data/public";
import type { ClubEvent, LearningResource, TeamMember } from "@/lib/types";
import { formatEventWhen } from "@/lib/utils";

/**
 * Deterministic fallback used when no Gemini key is configured or the API is
 * unavailable. It answers the most common questions from the same knowledge
 * the AI uses, so the widget is never a dead end.
 */

const STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "i",
  "to",
  "do",
  "how",
  "what",
  "can",
  "of",
  "for",
  "in",
  "on",
  "my",
  "me",
  "and",
  "or",
  "you",
  "it",
  "about",
  "does",
  "there",
  "any",
  "when",
  "who",
]);

const tokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

const GENERIC_LEARNING_WORDS = new Set([
  "learn",
  "learning",
  "start",
  "started",
  "starting",
  "begin",
  "resource",
  "resources",
  "course",
  "courses",
  "beginner",
  "beginners",
  "study",
  "tutorial",
  "tutorials",
  "practice",
  "get",
  "best",
  "good",
  "want",
  "should",
  "where",
]);

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export function offlineAnswer(
  question: string,
  ctx: { upcoming: ClubEvent[]; quizzes: QuizSummary[]; team: TeamMember[]; learning: LearningResource[] },
) {
  const q = question.toLowerCase();

  if (/^(hi|hello|hey|yo|namaste)\b/.test(q.trim()) && q.length < 24) {
    return "Hi! I can help with **upcoming events**, **registration & tickets**, **quiz rules**, **membership** and finding your way around the site. What do you need?";
  }

  if (has(q, "quiz", "score", "points", "leaderboard", "scoring")) {
    const live = ctx.quizzes.filter((z) => z.status === "published");
    return [
      "**How ISSA quizzes work**",
      ...rules.quizzes.map((r) => `- ${r}`),
      live.length
        ? `\nOpen now: ${live.map((z) => `[${z.title}](/quizzes/${z.id})`).join(", ")}`
        : "\nSee all quizzes on the [Quizzes](/quizzes) page.",
    ].join("\n");
  }

  if (
    has(
      q,
      "learn",
      "resource",
      "roadmap",
      "course",
      "study",
      "tutorial",
      "get started",
      "getting started",
      "practice",
      "beginner",
    )
  ) {
    if (!ctx.learning.length)
      return "The Learning hub is being stocked — check [Learn](/learn) soon, or ask a core team member for pointers.";
    // Score on topic words only; generic words ("learn", "start") would match everything.
    const words = tokens(question).filter((w) => !GENERIC_LEARNING_WORDS.has(w));
    const levelRank = (r: LearningResource) => ["beginner", "intermediate", "advanced"].indexOf(r.level);
    const scored = ctx.learning
      .map((r) => {
        const strong = [r.title, r.track, ...r.tags].join(" ").toLowerCase();
        const weak = (r.description ?? "").toLowerCase();
        return { r, score: words.reduce((sum, w) => sum + (strong.includes(w) ? 2 : weak.includes(w) ? 1 : 0), 0) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || levelRank(a.r) - levelRank(b.r))
      .map((x) => x.r);
    const featured = ctx.learning.filter((r) => r.is_featured);
    const picks = (scored.length ? scored : featured.length ? featured : ctx.learning).slice(0, 4);
    return [
      "**Good places to start:**",
      ...picks.map((r) => `- [${r.title}](${r.url}) — ${r.level}, ${r.track}${r.is_free ? " (free)" : ""}`),
      "\nBrowse everything by track and level in the [Learning hub](/learn).",
    ].join("\n");
  }

  if (has(q, "submit", "submission", "deadline", "upload", "repo")) {
    return [
      "**Hackathon & challenge submissions**",
      ...rules.submissions.map((r) => `- ${r}`),
      "\nOpen the event page to find the submission form.",
    ].join("\n");
  }

  if (has(q, "register", "ticket", "qr", "check-in", "check in", "cancel", "seat")) {
    return ["**Registering for an event**", ...rules.events.map((r) => `- ${r}`), "\nBrowse [upcoming events](/events)."].join(
      "\n",
    );
  }

  if (has(q, "event", "upcoming", "next", "workshop", "hackathon", "ctf", "schedule", "happening")) {
    if (!ctx.upcoming.length)
      return "There are no upcoming events announced right now. Keep an eye on the [Events](/events) page!";
    return [
      "**Coming up next:**",
      ...ctx.upcoming
        .slice(0, 4)
        .map(
          (e) =>
            `- [${e.title}](/events/${e.slug}) — ${formatEventWhen(e.starts_at, e.ends_at)}${e.location ? `, ${e.location}` : ""}${e.members_only ? " (members only)" : ""}`,
        ),
      "\nOpen an event and press **Register** to get your QR ticket.",
    ].join("\n");
  }

  if (has(q, "team", "office bearer", "president", "committee", "core", "lead", "head", "contact person")) {
    if (!ctx.team.length) return `The office bearers haven't been published yet. You can email ${contact.email}.`;
    return [
      "**Office bearers**",
      ...ctx.team.map((m) => `- **${m.name}** — ${m.designation}`),
      "\nSee them on the [Team](/#team) section.",
    ].join("\n");
  }

  if (has(q, "join", "member", "sign up", "signup", "account", "fee", "free")) {
    return [
      `**Joining ISSA**\n${membership.howToJoin}`,
      "",
      ...membership.benefits.map((b) => `- ${b}`),
      "",
      "Ready? [Create your account](/signup).",
    ].join("\n");
  }

  if (has(q, "contact", "email", "reach", "instagram", "social")) {
    return `You can reach the core team at **${contact.email}**, or find us at ${contact.location}.`;
  }

  // best FAQ by keyword overlap
  const qTokens = new Set(tokens(question));
  let best: { score: number; answer: string; question: string } | null = null;
  for (const faq of faqs) {
    const score = tokens(`${faq.question} ${faq.answer}`).reduce((s, t) => s + (qTokens.has(t) ? 1 : 0), 0);
    if (!best || score > best.score) best = { score, answer: faq.answer, question: faq.question };
  }
  if (best && best.score >= 2) return `**${best.question}**\n\n${best.answer}`;

  return `I'm running in offline mode, so I can only answer questions about the club. Try asking about:\n- upcoming events or how to register\n- quiz rules and scoring\n- joining the club\n- the office bearers\n\nFor anything else, email **${contact.email}**.`;
}
