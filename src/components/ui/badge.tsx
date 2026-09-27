import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-line bg-white/[0.04] text-muted",
  primary: "border-primary/25 bg-primary/10 text-primary",
  accent: "border-accent/25 bg-accent/10 text-accent",
  cyan: "border-cyan/25 bg-cyan/10 text-cyan",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  success: "border-success/25 bg-success/10 text-success",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
  pulse,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.7rem] font-medium tracking-wider uppercase",
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span className="relative flex size-1.5" aria-hidden>
          {pulse ? <span className="absolute inset-0 animate-pulse-ring rounded-full bg-current" /> : null}
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {children}
    </span>
  );
}
