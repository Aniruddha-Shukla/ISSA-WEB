"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { ScoreboardRow } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/feedback";
import { SOLVED_EVENT } from "./play-meta";

/** Top players across the flag hunt and the CTF arena. */
export function Scoreboard({ limit = 10, className }: { limit?: number; className?: string }) {
  const [rows, setRows] = useState<ScoreboardRow[] | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return setRows([]);
    const { data } = await getSupabaseBrowserClient().rpc("ctf_scoreboard", { p_limit: limit });
    setRows(((data as ScoreboardRow[] | null) ?? []).map((r) => ({ ...r, points: Number(r.points), solves: Number(r.solves) })));
  }, [limit]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
    const onSolved = () => void load();
    window.addEventListener(SOLVED_EVENT, onSolved);
    return () => window.removeEventListener(SOLVED_EVENT, onSolved);
  }, [load]);

  return (
    <div className={cn("rounded-3xl p-5 glass sm:p-6", className)}>
      <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.2em] text-ink uppercase">
        <Trophy className="size-4 text-gold" aria-hidden /> Scoreboard
      </h2>
      {rows === null ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No solves yet. Be the first on the board!</p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {rows.map((r) => (
            <li
              key={`${r.rank}-${r.display_name}`}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2",
                r.is_me ? "bg-primary/10 ring-1 ring-primary/30" : "bg-white/[0.02]",
              )}
            >
              <span
                className={cn(
                  "w-6 text-center font-display text-sm font-bold",
                  r.rank === 1 ? "text-gold" : r.rank <= 3 ? "text-ink" : "text-faint",
                )}
              >
                {r.rank}
              </span>
              <Avatar name={r.display_name} src={r.avatar_url} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {r.display_name}
                {r.is_me ? <span className="text-primary"> (you)</span> : null}
              </span>
              <span className="font-mono text-xs text-faint">{r.solves} solved</span>
              <span className="w-14 text-right font-display text-sm font-bold text-primary">{r.points}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
