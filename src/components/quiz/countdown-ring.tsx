"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Circular countdown. Announces 10s / 5s / time-up to screen readers without spamming every second. */
export function CountdownRing({
  remainingMs,
  totalSeconds,
  size = 88,
  className,
}: {
  remainingMs: number | null;
  totalSeconds: number;
  size?: number;
  className?: string;
}) {
  const [announcement, setAnnouncement] = useState("");
  const lastAnnounced = useRef<number | null>(null);

  const seconds = remainingMs === null ? totalSeconds : Math.ceil(remainingMs / 1000);
  const fraction = remainingMs === null ? 1 : Math.max(0, Math.min(1, remainingMs / (totalSeconds * 1000)));
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const urgent = seconds <= 5;

  useEffect(() => {
    if (remainingMs === null) return;
    const marks = [10, 5, 0];
    const mark = marks.find((m) => seconds === m);
    if (mark !== undefined && lastAnnounced.current !== mark) {
      lastAnnounced.current = mark;
      // announce on the next frame (keeps the effect free of synchronous state updates)
      requestAnimationFrame(() => setAnnouncement(mark === 0 ? "Time is up" : `${mark} seconds left`));
    }
  }, [seconds, remainingMs]);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(148 163 184 / 0.15)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? "var(--color-danger)" : "var(--color-primary)"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: "stroke 300ms" }}
        />
      </svg>
      <span
        role="timer"
        aria-label={`${seconds} seconds remaining`}
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold tabular-nums",
          urgent ? "text-danger" : "text-ink",
        )}
      >
        {seconds}
      </span>
      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
}
