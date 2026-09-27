"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/feedback";

export function useLeaderboard(quizId: string, limit = 50) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: rpcError } = await getSupabaseBrowserClient().rpc("get_leaderboard", {
      p_quiz_id: quizId,
      p_limit: limit,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setError(null);
    setRows((data as LeaderboardRow[]) ?? []);
  }, [quizId, limit]);

  useEffect(() => {
    const run = async () => {
      await refresh();
    };
    void run();
  }, [refresh]);

  return { rows, error, refresh };
}

const podium = [
  { icon: Crown, classes: "text-warning bg-warning/15 ring-warning/40" },
  { icon: Medal, classes: "text-slate-200 bg-slate-300/15 ring-slate-300/30" },
  { icon: Medal, classes: "text-amber-600 bg-amber-700/20 ring-amber-700/40" },
];

export function Leaderboard({
  rows,
  highlightMe = true,
  compact = false,
  max,
  title = "Leaderboard",
  className,
}: {
  rows: LeaderboardRow[] | null;
  highlightMe?: boolean;
  compact?: boolean;
  max?: number;
  title?: string;
  className?: string;
}) {
  if (rows === null) {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const visible = max ? rows.slice(0, max) : rows;
  const me = rows.find((r) => r.is_me);
  const meHidden = me && !visible.some((r) => r.id === me.id);

  return (
    <section aria-label={title} className={className}>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-5" />}
          title="No players yet"
          description="Scores appear here the moment someone answers."
          className="py-10"
        />
      ) : (
        <ol className="space-y-1.5">
          <AnimatePresence initial={false}>
            {[...visible, ...(meHidden && me ? [me] : [])].map((row, i) => {
              const top = row.rank <= 3 ? podium[row.rank - 1] : null;
              const isMe = highlightMe && row.is_me;
              return (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3",
                    compact ? "py-2" : "py-2.5",
                    isMe ? "border-primary/40 bg-primary/[0.08]" : "border-line bg-surface-2/60",
                    meHidden && i === visible.length && "mt-3 border-dashed",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold ring-1",
                      top ? top.classes : "bg-white/[0.04] text-muted ring-line",
                    )}
                    aria-label={`Rank ${row.rank}`}
                  >
                    {top ? <top.icon className="size-4" aria-hidden /> : row.rank}
                  </span>
                  <Avatar name={row.display_name} src={row.avatar_url} size={compact ? 28 : 32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {row.display_name}
                      {isMe ? <span className="ml-1.5 font-mono text-xs text-primary">(you)</span> : null}
                    </span>
                    {!compact ? (
                      <span className="block text-xs text-faint">
                        {row.correct_count} correct · {(row.total_time_ms / 1000).toFixed(1)}s
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono font-semibold text-base text-ink tabular-nums">
                    {row.score.toLocaleString("en-IN")}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </section>
  );
}
