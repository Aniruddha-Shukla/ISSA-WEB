"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Options = {
  /** Called when the quiz row changes (host advanced, revealed, ended…). Pushed over Realtime. */
  onQuizChange?: () => void;
  /** Called on a timer to refresh scores / player lists (see attemptsPollMs). */
  onAttemptsChange?: () => void;
  /** Quiz-state polling interval while Realtime is unavailable. */
  pollMs?: number;
  /** How often to refresh scores and player lists; 0 = only when Realtime (re)connects. */
  attemptsPollMs?: number;
  /** Open a Realtime channel. When false the screen relies on polling alone (see live-quiz). */
  realtime?: boolean;
  enabled?: boolean;
};

type SystemMessage = { extension?: string; status?: string; message?: string };

/**
 * Keeps a quiz screen in sync.
 *
 * Only the quiz row (host actions: next / reveal / end) is pushed over Supabase
 * Realtime: that is one message per viewer per transition. Scores are polled
 * instead of pushed, because pushing every answer to every player grows with
 * players² — 100 players would generate ~10,000 messages per question, far over
 * the free plan's 100 messages/second (Supabase disconnects clients past it).
 * A polling fallback keeps everything working if Realtime is down.
 */
export function useQuizRealtime(
  quizId: string,
  { onQuizChange, onAttemptsChange, pollMs = 4000, attemptsPollMs = 0, realtime = true, enabled = true }: Options,
) {
  const [connected, setConnected] = useState(false);
  const quizCb = useRef(onQuizChange);
  const attemptsCb = useRef(onAttemptsChange);

  useEffect(() => {
    quizCb.current = onQuizChange;
    attemptsCb.current = onAttemptsChange;
  });

  useEffect(() => {
    if (!enabled || !realtime) return;
    const supabase = getSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    // Unique topic per mount: supabase-js reuses channels by topic, and a remount
    // (React StrictMode, fast navigation) would attach to one that is being torn down.
    const suffix = Math.random().toString(36).slice(2, 10);

    const start = async () => {
      // Give the socket the user's JWT before joining; a join that races the
      // session restore would otherwise run as `anon` (drafts are admin-only).
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
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
    };
    void start();

    return () => {
      cancelled = true;
      setConnected(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [quizId, enabled, realtime]);

  // Quiz state: poll quickly when Realtime isn't connected, and every few seconds as a
  // safety net when it is (a missed "next question" must never leave a player stuck).
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => quizCb.current?.(), connected ? Math.max(pollMs * 2, 6000) : pollMs);
    return () => clearInterval(interval);
  }, [connected, enabled, pollMs]);

  // Scores / player lists.
  useEffect(() => {
    if (!enabled || attemptsPollMs <= 0) return;
    const interval = setInterval(() => attemptsCb.current?.(), attemptsPollMs);
    return () => clearInterval(interval);
  }, [enabled, attemptsPollMs]);

  return connected;
}
