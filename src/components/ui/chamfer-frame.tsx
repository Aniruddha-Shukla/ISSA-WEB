import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-gradient-to-br from-white/30 via-white/[0.07] to-white/20",
  neon: "bg-gradient-to-br from-primary/80 via-white/10 to-accent/80",
  gold: "bg-gradient-to-br from-gold/80 via-gold/10 to-gold/50",
} as const;

/**
 * Corner-cut panel with a 1px gradient border. `clip-path` would cut a normal
 * border off at the corners, so the border is an outer chamfered layer and the
 * content sits in a slightly smaller chamfer inside it.
 */
export function ChamferFrame({
  size = 22,
  tone = "default",
  className,
  innerClassName,
  children,
}: {
  size?: number;
  tone?: keyof typeof tones;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("p-px chamfer", tones[tone], className)} style={{ "--chamfer": `${size}px` } as CSSProperties}>
      {/* a 45° cut on a 1px border is ~0.41px shorter on the inside */}
      <div
        className={cn("h-full bg-surface chamfer", innerClassName)}
        style={{ "--chamfer": `${size - 0.41}px` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
