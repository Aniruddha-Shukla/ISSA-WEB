"use client";

import { useEffect, useState } from "react";

/**
 * Converts a server-side question start into a local deadline on the
 * monotonic clock. Anchoring to the moment the response arrived (instead of
 * the device's wall clock) makes timers immune to clock skew on phones.
 */
export function localDeadline({
  startedAt,
  serverNow,
  timeLimit,
  receivedAt,
}: {
  startedAt: string;
  serverNow: string;
  timeLimit: number;
  receivedAt: number;
}) {
  const remaining = Date.parse(startedAt) + timeLimit * 1000 - Date.parse(serverNow);
  return receivedAt + remaining;
}

/** Milliseconds left until a performance.now()-based deadline, updated every animation frame. */
export function useCountdown(deadline: number | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (deadline === null) return;
    let frame = 0;
    const tick = () => {
      const left = Math.max(0, deadline - performance.now());
      setRemaining(left);
      if (left > 0) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [deadline]);

  return deadline === null ? null : remaining;
}
