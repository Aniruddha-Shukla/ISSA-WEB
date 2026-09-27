"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarPlus, Lock, Ticket, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ClubEvent, Registration } from "@/lib/types";
import { errorMessage, formatDateTime } from "@/lib/utils";
import { formatCountdown, useNow } from "@/lib/use-now";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { TicketCard } from "./ticket-card";

const TEAM_CATEGORIES = new Set(["hackathon", "ctf", "competition"]);

export function RegistrationPanel({ event }: { event: ClubEvent }) {
  const { configured, loading: authLoading, user, profile } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const now = useNow();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [taken, setTaken] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [teamName, setTeamName] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [seats, mine] = await Promise.all([
      supabase.rpc("get_event_seats", { p_event_ids: [event.id] }),
      user
        ? supabase.from("registrations").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const seatRow = (seats.data as { event_id: string; registered: number }[] | null)?.[0];
    setTaken(seatRow?.registered ?? 0);
    setRegistration((mine.data as Registration | null) ?? null);
    setLoaded(true);
  }, [event.id, user]);

  useEffect(() => {
    if (!configured || authLoading) return;
    const run = async () => {
      await load();
    };
    void run();
  }, [configured, authLoading, load]);

  const calendarLink = (
    <a
      href={`/events/${event.slug}/calendar`}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <CalendarPlus className="size-4" aria-hidden /> Add to calendar (.ics)
    </a>
  );

  if (!configured) {
    return (
      <div>
        <Notice tone="warning" title="Registration is offline in demo mode">
          Connect Supabase (see README) to enable accounts, QR tickets and check-ins.
        </Notice>
        {calendarLink}
      </div>
    );
  }

  if (authLoading || !loaded || now === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  const holderName = profile?.full_name || user?.email || "Attendee";
  const startsAt = Date.parse(event.starts_at);
  const deadline = Date.parse(event.registration_deadline ?? event.starts_at);
  const deadlinePassed = now > deadline;
  const started = now >= startsAt;
  const left = event.capacity != null && taken != null ? Math.max(0, event.capacity - taken) : null;
  const active = registration && registration.status !== "cancelled" ? registration : null;

  async function register() {
    setBusy(true);
    const { data, error } = await getSupabaseBrowserClient().rpc("register_for_event", {
      p_event_id: event.id,
      p_team_name: teamName.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't register", errorMessage(error));
      void load();
      return;
    }
    setRegistration(data as Registration);
    setTaken((t) => (t ?? 0) + 1);
    toast.success("You're registered!", "Your QR ticket is ready below and in your profile.");
  }

  async function cancel() {
    if (!window.confirm("Cancel your registration? Your seat will be released to someone else.")) return;
    setBusy(true);
    const { error } = await getSupabaseBrowserClient().rpc("cancel_registration", { p_event_id: event.id });
    setBusy(false);
    if (error) {
      toast.error("Couldn't cancel", errorMessage(error));
      return;
    }
    toast.info("Registration cancelled");
    void load();
  }

  if (active) {
    return (
      <div>
        <TicketCard event={event} registration={active} holderName={holderName} />
        {active.status === "registered" && !started ? (
          <Button variant="ghost" size="sm" className="mt-2 w-full text-faint hover:text-danger" onClick={cancel} loading={busy}>
            Cancel registration
          </Button>
        ) : null}
        {calendarLink}
      </div>
    );
  }

  let blocker: { title: string; body: string; icon?: "lock" } | null = null;
  if (!event.registration_open) blocker = { title: "Registrations are closed", body: "Follow our socials for the next edition." };
  else if (deadlinePassed)
    blocker = { title: "Registration deadline has passed", body: `Registrations closed ${formatDateTime(new Date(deadline))}.` };
  else if (left === 0)
    blocker = {
      title: "This event is fully booked",
      body: "Seats free up when someone cancels — check back closer to the date.",
    };
  else if (event.members_only && user && profile?.role === "guest")
    blocker = {
      title: "Members only",
      body: "Sign up with your college email to be verified as a member automatically, or ask a core member to upgrade your account.",
      icon: "lock",
    };

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-display text-lg font-semibold text-ink">Register</p>
        {left !== null ? (
          <p className="text-sm text-muted">
            <span className={left <= 5 ? "font-semibold text-warning" : "font-semibold text-ink"}>{left}</span> seats left
          </p>
        ) : (
          <p className="text-sm text-muted">Open entry</p>
        )}
      </div>

      {blocker ? (
        <Notice tone={blocker.icon ? "info" : "warning"} title={blocker.title}>
          {blocker.body}
        </Notice>
      ) : !user ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Sign in to grab your seat. It takes 30 seconds.</p>
          <ButtonLink href={`/login?next=${encodeURIComponent(`${pathname}#register`)}`} className="w-full" size="lg">
            <Ticket className="size-4" aria-hidden /> Sign in to register
          </ButtonLink>
          {event.members_only ? (
            <p className="flex items-center gap-1.5 text-xs text-accent">
              <Lock className="size-3.5" aria-hidden /> Members only — use your college email.
            </p>
          ) : null}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void register();
          }}
        >
          {TEAM_CATEGORIES.has(event.category) ? (
            <div>
              <Label htmlFor="team-name">Team name (optional)</Label>
              <Input
                id="team-name"
                value={teamName}
                maxLength={80}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Null Pointers"
                autoComplete="off"
              />
            </div>
          ) : null}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            <Ticket className="size-4" aria-hidden /> {registration?.status === "cancelled" ? "Register again" : "Register now"}
          </Button>
          <p className="text-center text-xs text-faint">Registration closes in {formatCountdown(deadline - now)}</p>
        </form>
      )}

      {started && !deadlinePassed ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert className="size-3.5" aria-hidden /> This event is in progress.
        </p>
      ) : null}
      {calendarLink}
    </div>
  );
}
