"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Award, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppRole, Badge as BadgeRow, Profile } from "@/lib/types";
import { errorMessage, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/feedback";

const PAGE_SIZE = 25;

/** Strip characters that have meaning in PostgREST filter syntax. */
const sanitize = (q: string) => q.replace(/[,()*%\\]/g, " ").trim();

export function UsersAdmin() {
  const toast = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AppRole | "all">("all");
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [awarding, setAwarding] = useState<Profile | null>(null);
  const [badgeSlug, setBadgeSlug] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    let request = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (role !== "all") request = request.eq("role", role);
    const q = sanitize(search);
    if (q) request = request.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,roll_no.ilike.%${q}%,branch.ilike.%${q}%`);
    const { data, error, count } = await request;
    if (error) {
      toast.error("Couldn't load members", error.message);
      return;
    }
    setRows((data as Profile[]) ?? []);
    setTotal(count ?? 0);
  }, [page, role, search, toast]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  useEffect(() => {
    void getSupabaseBrowserClient()
      .from("badges")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setBadges((data as BadgeRow[]) ?? []));
  }, []);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setSearch(query);
  }

  async function changeRole(profile: Profile, next: AppRole) {
    if (
      profile.id === user?.id &&
      next !== "admin" &&
      !window.confirm("Remove your own admin access? You'll lose access to this dashboard.")
    )
      return;
    setRows((all) => all?.map((p) => (p.id === profile.id ? { ...p, role: next } : p)) ?? null);
    const { error } = await getSupabaseBrowserClient().from("profiles").update({ role: next }).eq("id", profile.id);
    if (error) {
      toast.error("Couldn't change role", errorMessage(error));
      await load();
      return;
    }
    toast.success(`${profile.full_name ?? profile.email} is now ${next === "admin" ? "an admin" : `a ${next}`}`);
  }

  async function awardBadge() {
    if (!awarding || !badgeSlug) return;
    const { error } = await getSupabaseBrowserClient()
      .from("user_badges")
      .insert({ user_id: awarding.id, badge_slug: badgeSlug, awarded_by: user?.id });
    if (error) {
      toast.error(
        "Couldn't award badge",
        /duplicate/i.test(error.message) ? "They already have this badge." : errorMessage(error),
      );
      return;
    }
    toast.success("Badge awarded");
    setAwarding(null);
    setBadgeSlug("");
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={onSearch} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <Input
              aria-label="Search members"
              placeholder="Name, email, roll no, branch…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Filter by role"
            value={role}
            onChange={(e) => {
              setPage(0);
              setRole(e.target.value as AppRole | "all");
            }}
            className="sm:w-40"
          >
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="member">Members</option>
            <option value="guest">Guests</option>
          </Select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="flex gap-2">
          <a href="/api/admin/export?dataset=members&format=csv" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Download className="size-4" aria-hidden /> CSV
          </a>
          <a href="/api/admin/export?dataset=members&format=json" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            JSON
          </a>
        </div>
      </div>

      {rows === null ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="No members found" description="Try a different search or role filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[50rem] text-left text-sm">
            <thead className="bg-surface-2 font-mono text-xs tracking-wider text-faint uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Member
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Roll · Branch · Year
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.full_name ?? p.email} src={p.avatar_url} size={34} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {p.full_name ?? "—"}{" "}
                          {p.id === user?.id ? <span className="font-mono text-xs text-primary">(you)</span> : null}
                        </p>
                        <p className="truncate text-xs text-faint">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[p.roll_no, p.branch, p.year ? `Y${p.year}` : null].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <Select
                      aria-label={`Role for ${p.full_name ?? p.email}`}
                      value={p.role}
                      onChange={(e) => void changeRole(p, e.target.value as AppRole)}
                      className="h-9 w-32"
                    >
                      <option value="guest">Guest</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setAwarding(p)}>
                      <Award className="size-4" aria-hidden /> Badge
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <p>
          {total} {total === 1 ? "account" : "accounts"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-mono text-xs">
            {page + 1} / {pages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(awarding)}
        onClose={() => setAwarding(null)}
        title="Award a badge"
        description={awarding ? `To ${awarding.full_name ?? awarding.email}` : undefined}
        size="sm"
      >
        <Field label="Badge" htmlFor="award-badge">
          <Select id="award-badge" value={badgeSlug} onChange={(e) => setBadgeSlug(e.target.value)}>
            <option value="">Choose…</option>
            {badges.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} — {b.description}
              </option>
            ))}
          </Select>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAwarding(null)}>
            Cancel
          </Button>
          <Button onClick={() => void awardBadge()} disabled={!badgeSlug}>
            <Award className="size-4" aria-hidden /> Award
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
