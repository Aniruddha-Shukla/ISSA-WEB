"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search, UserCheck, Undo2 } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ClubEvent, Registration, RegistrationStatus } from "@/lib/types";
import { cn, errorMessage, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/feedback";

type Attendee = { full_name: string | null; email: string; roll_no: string | null; branch: string | null; year: number | null };
type Row = Registration & { attendee: Attendee | null };

const statusTone = { registered: "primary", attended: "success", cancelled: "neutral" } as const;

export function EventAttendees({ event }: { event: ClubEvent }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RegistrationStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabaseBrowserClient()
      .from("registrations")
      .select("*, attendee:profiles!registrations_user_id_fkey(full_name, email, roll_no, branch, year)")
      .eq("event_id", event.id)
      .order("registered_at", { ascending: true });
    if (error) toast.error("Couldn't load registrations", error.message);
    else setRows((data as Row[]) ?? []);
  }, [event.id, toast]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
    const interval = setInterval(() => void load(), 20000);
    return () => clearInterval(interval);
  }, [load]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const active = all.filter((r) => r.status !== "cancelled").length;
    const attended = all.filter((r) => r.status === "attended").length;
    return { active, attended, cancelled: all.length - active, rate: active ? Math.round((attended / active) * 100) : 0 };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      const a = r.attendee;
      return [a?.full_name, a?.email, a?.roll_no, r.ticket_code, r.team_name].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, query, status]);

  async function checkIn(row: Row) {
    setBusyId(row.id);
    const { error } = await getSupabaseBrowserClient().rpc("check_in_ticket", { p_code: row.ticket_code });
    setBusyId(null);
    if (error) toast.error("Check-in failed", errorMessage(error));
    else toast.success(`${row.attendee?.full_name ?? "Attendee"} checked in`);
    await load();
  }

  async function undo(row: Row) {
    setBusyId(row.id);
    const { error } = await getSupabaseBrowserClient()
      .from("registrations")
      .update({ status: "registered", checked_in_at: null, checked_in_by: null })
      .eq("id", row.id);
    setBusyId(null);
    if (error) toast.error("Couldn't undo check-in", errorMessage(error));
    await load();
  }

  const exportHref = (dataset: string, format: string) =>
    `/api/admin/export?dataset=${dataset}&format=${format}&event_id=${event.id}`;

  return (
    <div>
      <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {[
          { label: "Registered", value: `${stats.active}${event.capacity ? ` / ${event.capacity}` : ""}` },
          { label: "Checked in", value: stats.attended },
          { label: "Attendance", value: `${stats.rate}%` },
          { label: "Cancelled", value: stats.cancelled },
        ].map((s) => (
          <div key={s.label} className="bg-surface px-5 py-4">
            <dt className="font-mono text-[0.68rem] tracking-[0.16em] text-faint uppercase">{s.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <Input
              aria-label="Search attendees"
              placeholder="Name, email, roll no, ticket…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as RegistrationStatus | "all")}
            className="sm:w-44"
          >
            <option value="all">All statuses</option>
            <option value="registered">Registered</option>
            <option value="attended">Checked in</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden /> Refresh
          </Button>
          <a href={exportHref("registrations", "csv")} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Download className="size-4" aria-hidden /> Registrations CSV
          </a>
          <a href={exportHref("attendance", "csv")} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Download className="size-4" aria-hidden /> Attendance CSV
          </a>
        </div>
      </div>

      {rows === null ? (
        <Skeleton className="h-48 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={rows.length ? "No matching attendees" : "No registrations yet"}
          description={rows.length ? "Try another search or filter." : "Share the event link to start filling seats."}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-surface-2 font-mono text-xs tracking-wider text-faint uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Attendee
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Roll · Branch · Year
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Ticket
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Registered
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {filtered.map((r) => (
                <tr key={r.id} className={cn(r.status === "cancelled" && "opacity-60")}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{r.attendee?.full_name ?? "—"}</p>
                    <p className="text-xs text-faint">{r.attendee?.email}</p>
                    {r.team_name ? <p className="text-xs text-accent">Team {r.team_name}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[r.attendee?.roll_no, r.attendee?.branch, r.attendee?.year ? `Y${r.attendee.year}` : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink">{r.ticket_code}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(r.registered_at)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[r.status]}>{r.status === "attended" ? "checked in" : r.status}</Badge>
                    {r.checked_in_at ? <p className="mt-1 text-xs text-faint">{formatDateTime(r.checked_in_at)}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "registered" ? (
                      <Button size="sm" onClick={() => void checkIn(r)} loading={busyId === r.id}>
                        <UserCheck className="size-4" aria-hidden /> Check in
                      </Button>
                    ) : r.status === "attended" ? (
                      <Button size="sm" variant="ghost" onClick={() => void undo(r)} loading={busyId === r.id}>
                        <Undo2 className="size-4" aria-hidden /> Undo
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
