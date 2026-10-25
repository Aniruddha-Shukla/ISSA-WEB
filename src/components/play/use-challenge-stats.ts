"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SOLVED_EVENT } from "./play-meta";

export type ChallengeStat = { solves: number; solvedByMe: boolean };

/** Solve counts per challenge and which ones the signed-in player has solved. */
export function useChallengeStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, ChallengeStat>>({});

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await getSupabaseBrowserClient().rpc("ctf_challenge_stats");
    if (!data) return;
    const rows = data as { challenge_id: string; solves: number; solved_by_me: boolean }[];
    setStats(Object.fromEntries(rows.map((r) => [r.challenge_id, { solves: Number(r.solves), solvedByMe: r.solved_by_me }])));
  }, []);

  useEffect(() => {
    const run = async () => {
      await refresh();
    };
    void run();
  }, [refresh, user?.id]);

  useEffect(() => {
    const onSolved = () => void refresh();
    window.addEventListener(SOLVED_EVENT, onSolved);
    return () => window.removeEventListener(SOLVED_EVENT, onSolved);
  }, [refresh]);

  return stats;
}
