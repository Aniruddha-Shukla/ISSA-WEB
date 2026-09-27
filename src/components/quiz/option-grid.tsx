"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Circle, Diamond, Hexagon, Square, Star, Triangle, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Colour + shape + letter, so options are distinguishable without colour vision.
const styles: { letter: string; icon: LucideIcon; tint: string; ring: string }[] = [
  { letter: "A", icon: Triangle, tint: "from-primary/25 to-primary/5 text-primary", ring: "hover:border-primary/60" },
  { letter: "B", icon: Diamond, tint: "from-accent/25 to-accent/5 text-accent", ring: "hover:border-accent/60" },
  { letter: "C", icon: Circle, tint: "from-cyan/25 to-cyan/5 text-cyan", ring: "hover:border-cyan/60" },
  { letter: "D", icon: Square, tint: "from-warning/25 to-warning/5 text-warning", ring: "hover:border-warning/60" },
  { letter: "E", icon: Star, tint: "from-pink-400/25 to-pink-400/5 text-pink-300", ring: "hover:border-pink-400/60" },
  { letter: "F", icon: Hexagon, tint: "from-blue-400/25 to-blue-400/5 text-blue-300", ring: "hover:border-blue-400/60" },
];

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

export function OptionGrid({
  options,
  onSelect,
  disabled,
  stateFor,
  distribution,
  keyboard = true,
}: {
  options: string[];
  onSelect?: (index: number) => void;
  disabled?: boolean;
  stateFor: (index: number) => OptionState;
  distribution?: number[];
  keyboard?: boolean;
}) {
  // 1–6 keyboard shortcuts while answering
  useEffect(() => {
    if (!keyboard || disabled || !onSelect) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        event.preventDefault();
        onSelect(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, disabled, onSelect, options.length]);

  const total = distribution?.reduce((a, b) => a + b, 0) ?? 0;

  return (
    <div role="group" aria-label="Answer options" className="grid gap-3 sm:grid-cols-2">
      {options.map((option, index) => {
        const style = styles[index % styles.length];
        const state = stateFor(index);
        const Icon = style.icon;
        const count = distribution?.[index] ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <motion.button
            key={index}
            type="button"
            whileTap={disabled ? undefined : { scale: 0.98 }}
            disabled={disabled}
            onClick={() => onSelect?.(index)}
            aria-pressed={state === "selected" || undefined}
            aria-label={`Option ${style.letter}: ${option}${state === "correct" ? " — correct answer" : state === "wrong" ? " — your answer, incorrect" : state === "selected" ? " — your answer" : ""}`}
            className={cn(
              "relative flex min-h-20 items-center gap-4 overflow-hidden rounded-2xl border bg-gradient-to-br px-4 py-4 text-left transition-[border-color,opacity,box-shadow] disabled:cursor-default",
              style.tint,
              state === "idle" && cn("border-line-strong", !disabled && style.ring),
              state === "selected" && "border-ink/70 shadow-[0_0_0_3px_rgb(231_237_245/0.15)]",
              state === "correct" && "border-success shadow-[0_0_0_3px_rgb(52_211_153/0.25)]",
              state === "wrong" && "border-danger/80",
              state === "dimmed" && "border-line opacity-45",
            )}
          >
            {distribution ? (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-white/[0.06]"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ) : null}
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/30 ring-1 ring-white/10">
              <Icon className="size-4 fill-current" aria-hidden />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block font-mono text-[0.7rem] text-faint">
                {style.letter}
                <span className="sr-only"> (press {index + 1})</span>
              </span>
              <span className="block leading-snug font-medium text-base text-ink">{option}</span>
            </span>
            {distribution ? <span className="relative font-mono text-sm text-muted tabular-nums">{count}</span> : null}
            {state === "correct" ? <Check className="relative size-6 shrink-0 text-success" aria-hidden /> : null}
            {state === "wrong" ? <X className="relative size-6 shrink-0 text-danger" aria-hidden /> : null}
          </motion.button>
        );
      })}
    </div>
  );
}
