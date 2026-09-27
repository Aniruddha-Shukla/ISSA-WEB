import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Download, ScanQrCode, Trophy } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminOverview } from "@/lib/types";
import { fillWeeks } from "@/lib/weeks";
import { Notice } from "@/components/ui/feedback";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AttendanceChart, SignupsChart } from "@/components/admin/overview-charts";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const quickLinks = [
  { href: "/admin/events", label: "Create an event", icon: CalendarPlus },
  { href: "/admin/check-in", label: "Open check-in scanner", icon: ScanQrCode },
  { href: "/admin/quizzes", label: "Build a quiz", icon: Trophy },
  { href: "/admin/exports", label: "Export data", icon: Download },
];

function compact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}

export default async function AdminOverviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_overview");
  const overview = data as AdminOverview | null;

  if (error || !overview) {
    return (
      <Notice tone="error" title="Couldn't load analytics">
        {error?.message ?? "Unknown error"}
      </Notice>
    );
  }

  // Check-in rate only counts events that have already started.
  // eslint-disable-next-line react-hooks/purity -- request-time server render
  const now = Date.now();
  const past = overview.recent_events.filter((e) => Date.parse(e.starts_at) < now);
  const pastRegistered = past.reduce((s, e) => s + e.registered, 0);
  const pastAttended = past.reduce((s, e) => s + e.attended, 0);
  const rate = pastRegistered ? Math.round((pastAttended / pastRegistered) * 100) : null;

  const tiles = [
    {
      label: "Members",
      value: compact(overview.members),
      sub: `${compact(overview.users)} accounts · ${overview.admins} admins`,
    },
    { label: "Upcoming events", value: compact(overview.events_upcoming), sub: `${overview.events_total} total` },
    { label: "Active registrations", value: compact(overview.registrations), sub: `${compact(overview.attended)} checked in` },
    { label: "Check-in rate", value: rate === null ? "—" : `${rate}%`, sub: "recent past events" },
    { label: "Quiz attempts", value: compact(overview.quiz_attempts), sub: "all quizzes" },
    { label: "Submissions", value: compact(overview.submissions), sub: "hackathons & challenges" },
  ];

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="Club health at a glance. Numbers update live as students register, check in and play."
      />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <dt className="text-sm text-muted">{t.label}</dt>
            <dd className="mt-1 font-sans text-3xl font-semibold text-ink">{t.value}</dd>
            <dd className="mt-1 text-xs text-faint">{t.sub}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[1.5fr_1fr]">
        <AttendanceChart events={overview.recent_events} />
        <SignupsChart series={fillWeeks(overview.signups_by_week, now)} />
      </div>

      <section aria-labelledby="quick-actions" className="mt-6">
        <h2 id="quick-actions" className="sr-only">
          Quick actions
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 card card-hover p-4 text-sm font-medium text-ink">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
