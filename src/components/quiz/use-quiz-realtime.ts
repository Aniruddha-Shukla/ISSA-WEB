"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Options = {
  /** Called when the quiz row changes (host advanced, revealed, ended…). */
  onQuizChange?: () => void;
  /** Called (debounced) when attempts change: joins, answers, scores. */
  onAttemptsChange?: () => void;
  /** Fallback polling interval while realtime is unavailable. */
  pollMs?: number;
  enabled?: boolean;
};

type SystemMessage = { extension?: string; status?: string; message?: string };

/**
 * Subscribes to Supabase Realtime for one quiz, with a polling fallback so the
 * UI keeps working if Realtime is disabled or the socket drops.
 *
 * - Quiz state and attempts use separate channels: attempts are only readable
 *   by signed-in users, and a rejected binding would otherwise take down the
 *   whole channel (including the quiz-state updates spectators can see).
 * - The realtime socket is given the user's JWT before joining; otherwise a
 *   join that races the session restore runs as `anon` and RLS rejects it.
 */
export function useQuizRealtime(quizId: string, { onQuizChange, onAttemptsChange, pollMs = 4000, enabled = true }: Options) {
  const [connected, setConnected] = useState(false);
  const quizCb = useRef(onQuizChange);
  const attemptsCb = useRef(onAttemptsChange);

  useEffect(() => {
    quizCb.current = onQuizChange;
    attemptsCb.current = onAttemptsChange;
  });

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowserClient();
    const channels: RealtimeChannel[] = [];
    let cancelled = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    // Unique topics per mount: supabase-js reuses channels by topic, and a remount
    // (React StrictMode, fast navigation) would attach to one that is being torn down.
    const suffix = Math.random().toString(36).slice(2, 10);

    const start = async () => {
      await supabase.realtime.setAuth();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const quizChannel = supabase
        .channel(`quiz:${quizId}:${suffix}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quizzes", filter: `id=eq.${quizId}` }, () =>
          quizCb.current?.(),
        )
        // SUBSCRIBED arrives before the database change feed is attached; only the
        // postgres_changes system message means changes will flow.
        .on("system", {}, (message: SystemMessage) => {
          if (message.extension !== "postgres_changes") return;
          const ok = message.status === "ok";
          setConnected(ok);
          if (ok) {
            quizCb.current?.(); // cover anything that changed while joining
            attemptsCb.current?.();
          }
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") setConnected(false);
        });
      channels.push(quizChannel);

      if (data.session) {
        const attemptsChannel = supabase
          .channel(`quiz-attempts:${quizId}:${suffix}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "quiz_attempts", filter: `quiz_id=eq.${quizId}` },
            () => {
              clearTimeout(debounce);
              debounce = setTimeout(() => attemptsCb.current?.(), 600);
            },
          )
          .subscribe();
        channels.push(attemptsChannel);
      }
    };
    void start();

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      channels.forEach((channel) => void supabase.removeChannel(channel));
    };
  }, [quizId, enabled]);

  // Poll quickly when realtime isn't connected, and every ~8s as a safety net when it is
  // (a missed "next question" must never leave a player stuck for long).
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(
      () => {
        quizCb.current?.();
        attemptsCb.current?.();
      },
      connected ? Math.max(pollMs * 3, 8000) : pollMs,
    );
    return () => clearInterval(interval);
  }, [connected, enabled, pollMs]);

  return connected;
}
