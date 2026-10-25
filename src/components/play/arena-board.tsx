"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Download, Users } from "lucide-react";
import type { ChallengeCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FlagForm } from "./flag-form";
import { Hint } from "./hint";
import type { BoardItem } from "./hunt-board";
import { categoryMeta, difficultyTone } from "./play-meta";
import { useChallengeStats } from "./use-challenge-stats";

/** CTF arena: filter by category, open a challenge, submit its flag. */
export function ArenaBoard({ items }: { items: BoardItem[] }) {
  const stats = useChallengeStats();
  const [category, setCategory] = useState<ChallengeCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(items.map((i) => i.challenge.category))], [items]);
  const visible = items.filter((i) => category === "all" || i.challenge.category === category);
  const open = items.find((i) => i.challenge.id === openId);
  const myPoints = items.reduce((sum, i) => sum + (stats[i.challenge.id]?.solvedByMe ? i.challenge.points : 0), 0);
  const total = items.reduce((sum, i) => sum + i.challenge.points, 0);

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4">
        <p className="font-display text-sm font-bold tracking-[0.2em] text-ink uppercase">
          Your score: <span className="text-primary">{myPoints}</span> / {total}
        </p>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap justify-center gap-2">
          {(["all", ...categories] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                category === c
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {c === "all" ? "All" : categoryMeta[c].label}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ challenge: c }) => {
          const { icon: Icon, label } = categoryMeta[c.category];
          const stat = stats[c.id];
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpenId(c.id)}
                className={cn(
                  "group flex h-full w-full flex-col rounded-3xl p-5 text-left transition-[border-color,box-shadow] glass hover:border-primary/50 hover:shadow-[0_0_30px_-12px_rgb(34_211_238/0.6)]",
                  stat?.solvedByMe && "border-success/40 bg-success/[0.04]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-display text-lg font-bold text-primary">{c.points}</span>
                </div>
                <p className="mt-4 font-mono text-[0.65rem] tracking-[0.18em] text-faint uppercase">{label}</p>
                <h2 className="mt-1 font-display font-bold tracking-[0.05em] text-base text-ink uppercase">{c.title}</h2>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <Badge tone={difficultyTone[c.difficulty]}>{c.difficulty}</Badge>
                  {stat?.solvedByMe ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CircleCheck className="size-3.5" aria-hidden /> Solved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-faint">
                      <Users className="size-3.5" aria-hidden /> {stat?.solves ?? 0} solves
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={open?.challenge.title ?? ""}
        description={
          open
            ? `${categoryMeta[open.challenge.category].label} · ${open.challenge.difficulty} · ${open.challenge.points} points`
            : undefined
        }
        size="lg"
      >
        {open ? (
          <div className="space-y-5">
            {open.description}
            {open.challenge.attachment_url ? (
              <a
                href={open.challenge.attachment_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                <Download className="size-4" aria-hidden /> Download attachment
              </a>
            ) : null}
            {open.challenge.hint ? <Hint key={open.challenge.id} text={open.challenge.hint} /> : null}
            <FlagForm
              key={open.challenge.id}
              challengeId={open.challenge.id}
              title={open.challenge.title}
              solved={Boolean(stats[open.challenge.id]?.solvedByMe)}
            />
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
