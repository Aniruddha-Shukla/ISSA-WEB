"use client";

import type { ReactNode } from "react";
import { CircleCheck, Flag } from "lucide-react";
import type { CtfChallenge } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FlagForm } from "./flag-form";
import { Hint } from "./hint";
import { difficultyTone } from "./play-meta";
import { useChallengeStats } from "./use-challenge-stats";

export type BoardItem = { challenge: CtfChallenge; description: ReactNode };

/** The website flag hunt: progress, then one card per hidden flag. */
export function HuntBoard({ items }: { items: BoardItem[] }) {
  const stats = useChallengeStats();
  const found = items.filter((i) => stats[i.challenge.id]?.solvedByMe).length;
  const pct = items.length ? Math.round((found / items.length) * 100) : 0;

  return (
    <div>
      <div className="mx-auto mb-10 max-w-xl text-center">
        <p className="font-display text-sm font-bold tracking-[0.2em] text-ink uppercase">
          {found} / {items.length} flags found
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={found}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-label="Flags found"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ol className="grid gap-5 md:grid-cols-2">
        {items.map(({ challenge: c, description }, i) => {
          const solved = Boolean(stats[c.id]?.solvedByMe);
          return (
            <li
              key={c.id}
              className={cn(
                "flex flex-col gap-4 rounded-3xl p-6 transition-colors glass",
                solved && "border-success/40 bg-success/[0.04]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl border font-display text-sm font-bold",
                      solved ? "border-success/40 bg-success/10 text-success" : "border-gold/30 bg-gold/10 text-gold",
                    )}
                  >
                    {solved ? <CircleCheck className="size-5" aria-hidden /> : <Flag className="size-4" aria-hidden />}
                  </span>
                  <div>
                    <p className="font-mono text-[0.65rem] tracking-[0.18em] text-faint uppercase">Flag {i + 1}</p>
                    <h2 className="font-display text-lg font-bold tracking-[0.06em] text-ink uppercase">{c.title}</h2>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="font-display text-sm font-bold text-primary">{c.points} pts</span>
                  <Badge tone={difficultyTone[c.difficulty]}>{c.difficulty}</Badge>
                </div>
              </div>
              <div className="text-sm">{description}</div>
              {c.hint ? <Hint text={c.hint} /> : null}
              <div className="mt-auto">
                <FlagForm challengeId={c.id} title={c.title} solved={solved} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
