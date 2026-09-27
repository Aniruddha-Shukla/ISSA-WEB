"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import type { LearningLevel, LearningResource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input, Switch } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { ResourceCard } from "./resource-card";

const levels: { id: LearningLevel | "all"; label: string }[] = [
  { id: "all", label: "All levels" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export function LearningHub({ resources }: { resources: LearningResource[] }) {
  const [track, setTrack] = useState("All");
  const [level, setLevel] = useState<LearningLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);

  // Tracks in the order admins arranged them (first appearance), "All" first.
  const tracks = useMemo(() => ["All", ...new Set(resources.map((r) => r.track))], [resources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter(
      (r) =>
        (track === "All" || r.track === track) &&
        (level === "all" || r.level === level) &&
        (!freeOnly || r.is_free) &&
        (!q || [r.title, r.description ?? "", r.source ?? "", r.track, ...r.tags].join(" ").toLowerCase().includes(q)),
    );
  }, [resources, track, level, freeOnly, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, LearningResource[]>();
    for (const r of filtered) map.set(r.track, [...(map.get(r.track) ?? []), r]);
    return [...map.entries()];
  }, [filtered]);

  if (resources.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="size-5" />}
        title="The library is being stocked"
        description="The core team is curating the best free resources. Check back soon!"
      />
    );
  }

  return (
    <div>
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <Input
              aria-label="Search resources"
              placeholder="Search: SQL injection, Linux, CTF…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div role="group" aria-label="Filter by level" className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
              {levels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={level === l.id}
                  onClick={() => setLevel(l.id)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-sm transition-colors",
                    level === l.id ? "bg-surface-3 text-ink ring-1 ring-line-strong" : "text-muted hover:text-ink",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="w-44">
              <Switch id="free-only" label="Free only" checked={freeOnly} onChange={setFreeOnly} />
            </div>
          </div>
        </div>
        <div role="group" aria-label="Filter by track" className="flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={track === t}
              onClick={() => setTrack(t)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                track === t
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {filtered.length} of {resources.length} resources
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No resources match" description="Try another track, level or search term." />
      ) : (
        <div className="space-y-12">
          {grouped.map(([name, items]) => (
            <section key={name} aria-labelledby={`track-${name}`}>
              <h2 id={`track-${name}`} className="mb-4 flex items-baseline gap-3 font-display text-xl font-semibold text-ink">
                {name}
                <span className="font-mono text-sm font-normal text-faint">{items.length}</span>
              </h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <li key={r.id}>
                    <ResourceCard resource={r} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
