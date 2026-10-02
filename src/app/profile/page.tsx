import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, FileCode, Medal, Ticket, Trophy } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { isEventOver } from "@/lib/data/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Badge as BadgeRow, ClubEvent, Registration, Submission, UserBadge } from "@/lib/types";
import { cn, formatDate, formatDateTime, roleLabel } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { NamedIcon } from "@/components/ui/icon";
import { Container } from "@/components/ui/section-heading";
import { TicketCard } from "@/components/events/ticket-card";
import { submissionStatusTone } from "@/components/events/status";
import { ProfileEditor } from "@/components/profile/profile-editor";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

type RegistrationWithEvent = Registration & { events: ClubEvent | null };
type SubmissionWithEvent = Submission & { events: Pick<ClubEvent, "title" | "slug"> | null };
type QuizResult = {
  quiz_id: string;
  title: string;
  mode: string;
  status: string;
  score: number;
  correct_count: number;
  answered_count: number;
  rank: number;
  players: number;
  finished: boolean;
  started_at: string;
};

function SectionTitle({
  id,
  icon: Icon,
  children,
  count,
}: {
  id: string;
  icon: typeof Ticket;
  children: string;
  count?: number;
}) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-ink">
      <Icon className="size-5 text-primary" aria-hidden /> {children}
      {typeof count === "number" ? <span className="font-mono text-sm font-normal text-faint">({count})</span> : null}
    </h2>
  );
}

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  const supabase = await createSupabaseServerClient();

  const [regsRes, quizRes, subsRes, badgesRes, allBadgesRes] = await Promise.all([
    supabase.from("registrations").select("*, events(*)").eq("user_id", profile.id).order("registered_at", { ascending: false }),
    supabase.rpc("my_quiz_results"),
    supabase
      .from("submissions")
      .select("*, events(title, slug)")
      .eq("user_id", profile.id)
      .order("submitted_at", { ascending: false }),
    supabase.from("user_badges").select("user_id, badge_slug, awarded_at").eq("user_id", profile.id),
    supabase.from("badges").select("*").order("sort_order"),
  ]);

  const registrations = ((regsRes.data as RegistrationWithEvent[]) ?? []).filter((r) => r.events);
  const tickets = registrations.filter((r) => r.status !== "cancelled" && !isEventOver(r.events!));
  const history = registrations.filter((r) => isEventOver(r.events!) || r.status === "attended");
  const results = (quizRes.data as QuizResult[]) ?? [];
  const submissions = (subsRes.data as SubmissionWithEvent[]) ?? [];
  const earned = new Map(((badgesRes.data as UserBadge[]) ?? []).map((b) => [b.badge_slug, b.awarded_at]));
  const badges = (allBadgesRes.data as BadgeRow[]) ?? [];

  const attended = registrations.filter((r) => r.status === "attended").length;
  const bestRank = results.length ? Math.min(...results.map((r) => r.rank)) : null;
  const incomplete = !profile.roll_no || !profile.branch || !profile.year;
  const name = profile.full_name || profile.email.split("@")[0];

  return (
    <Container className="py-10 sm:py-14">
      <section className="relative overflow-hidden card p-6 sm:p-8">
        <div
          className="absolute -top-36 -right-36 size-96 bg-[radial-gradient(closest-side,rgb(34_211_238/0.12),transparent)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={name} src={profile.avatar_url} size={88} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-ink">{name}</h1>
              <Badge tone={profile.role === "admin" ? "accent" : profile.role === "member" ? "primary" : "neutral"}>
                {roleLabel[profile.role]}
              </Badge>
            </div>
            <p className="mt-1 text-muted">{profile.email}</p>
            <p className="mt-2 text-sm text-faint">
              {[profile.roll_no, profile.branch, profile.year ? `Year ${profile.year}` : null].filter(Boolean).join(" · ") ||
                "Add your roll number, branch and year"}
              {" · "}joined {formatDate(profile.created_at)}
            </p>
            {profile.bio ? <p className="mt-3 max-w-2xl text-sm text-muted">{profile.bio}</p> : null}
          </div>
          <ProfileEditor profile={profile} prominent={incomplete} />
        </div>

        <dl className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[
            { label: "Upcoming tickets", value: tickets.length },
            { label: "Events attended", value: attended },
            { label: "Quizzes played", value: results.length },
            { label: "Best quiz rank", value: bestRank ? `#${bestRank}` : "—" },
          ].map((s) => (
            <div key={s.label} className="bg-surface-2 px-5 py-4">
              <dt className="font-mono text-[0.68rem] tracking-[0.16em] text-faint uppercase">{s.label}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {incomplete ? (
        <Notice className="mt-6" title="Complete your profile">
          Adding your roll number, branch and year speeds up check-in and certificates.
        </Notice>
      ) : null}
      {profile.role === "guest" ? (
        <Notice className="mt-6" tone="info" title="You're signed in as a guest">
          Members-only events need the Member role. Sign up with your college email, or ask a core team member to verify you.
        </Notice>
      ) : null}

      <div className="mt-12 space-y-14">
        <section id="tickets" aria-labelledby="tickets-title">
          <SectionTitle id="tickets-title" icon={Ticket} count={tickets.length}>
            My tickets
          </SectionTitle>
          {tickets.length === 0 ? (
            <EmptyState
              icon={<Ticket className="size-5" />}
              title="No upcoming tickets"
              description="Register for an event and your QR ticket will appear here."
              action={
                <Link href="/events" className="text-sm font-medium text-primary hover:underline">
                  Browse events →
                </Link>
              }
            />
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {tickets.map((r) => (
                <li key={r.id}>
                  <Link href={`/events/${r.events!.slug}`} className="mb-3 block">
                    <p className="font-semibold text-ink hover:text-primary">{r.events!.title}</p>
                    <p className="text-sm text-muted">{formatDateTime(r.events!.starts_at)}</p>
                  </Link>
                  <TicketCard event={r.events!} registration={r} holderName={name} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="history-title">
          <SectionTitle id="history-title" icon={CalendarCheck} count={history.length}>
            Event history
          </SectionTitle>
          {history.length === 0 ? (
            <p className="text-sm text-muted">Events you attend will be listed here.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <Link href={`/events/${r.events!.slug}`} className="font-medium text-ink hover:text-primary">
                      {r.events!.title}
                    </Link>
                    <p className="text-sm text-faint">{formatDate(r.events!.starts_at)}</p>
                  </div>
                  <Badge tone={r.status === "attended" ? "success" : r.status === "cancelled" ? "neutral" : "warning"}>
                    {r.status === "attended" ? "attended" : r.status === "cancelled" ? "cancelled" : "missed"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="quiz-title">
          <SectionTitle id="quiz-title" icon={Trophy} count={results.length}>
            Quiz scores
          </SectionTitle>
          {results.length === 0 ? (
            <p className="text-sm text-muted">
              You haven&apos;t played a quiz yet.{" "}
              <Link href="/quizzes" className="text-primary hover:underline">
                Try one →
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-surface-2 font-mono text-xs tracking-wider text-faint uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3">
                      Quiz
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Score
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Correct
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Rank
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Played
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {results.map((r) => (
                    <tr key={r.quiz_id}>
                      <td className="px-5 py-3">
                        <Link href={`/quizzes/${r.quiz_id}`} className="font-medium text-ink hover:text-primary">
                          {r.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono text-ink tabular-nums">{r.score.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3 text-muted">{r.correct_count}</td>
                      <td className="px-5 py-3">
                        <span className={cn("font-mono", r.rank <= 3 ? "text-warning" : "text-muted")}>#{r.rank}</span>
                        <span className="text-faint"> / {r.players}</span>
                      </td>
                      <td className="px-5 py-3 text-faint">{formatDate(r.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {submissions.length ? (
          <section aria-labelledby="subs-title">
            <SectionTitle id="subs-title" icon={FileCode} count={submissions.length}>
              Submissions
            </SectionTitle>
            <ul className="grid gap-4 md:grid-cols-2">
              {submissions.map((s) => (
                <li key={s.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-ink">{s.title}</p>
                    <Badge tone={submissionStatusTone[s.status]}>{s.status.replace("_", " ")}</Badge>
                  </div>
                  {s.events ? (
                    <Link href={`/events/${s.events.slug}`} className="mt-1 block text-sm text-muted hover:text-primary">
                      {s.events.title}
                    </Link>
                  ) : null}
                  <p className="mt-2 text-xs text-faint">Updated {formatDateTime(s.updated_at)}</p>
                  {s.feedback ? <p className="mt-3 text-sm text-muted">“{s.feedback}”</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="badges-title">
          <SectionTitle id="badges-title" icon={Medal} count={earned.size}>
            Badges
          </SectionTitle>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((b) => {
              const at = earned.get(b.slug);
              return (
                <li
                  key={b.slug}
                  className={cn("flex items-start gap-4 card p-5", !at && "opacity-45 grayscale")}
                  aria-label={`${b.name}: ${at ? `earned ${formatDate(at)}` : "locked"}`}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      at ? "bg-warning/15 text-warning" : "bg-white/5 text-faint",
                    )}
                  >
                    <NamedIcon name={b.icon} className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{b.name}</span>
                    <span className="mt-0.5 block text-sm text-muted">{b.description}</span>
                    <span className="mt-1 block font-mono text-[0.68rem] tracking-wider text-faint uppercase">
                      {at ? `earned ${formatDate(at)}` : "locked"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Container>
  );
}
