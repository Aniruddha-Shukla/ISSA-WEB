"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useFx } from "./use-fx";

/**
 * A giant outlined text band that drifts sideways, speeds up with scroll velocity
 * and flips direction when you scroll back up. Decorative only (aria-hidden).
 */
export function ScrollMarquee({
  words,
  baseVelocity = 2.5,
  className,
}: {
  words: readonly string[];
  /** % of one copy per second; negative runs right-to-left the other way. */
  baseVelocity?: number;
  className?: string;
}) {
  const fx = useFx();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: "100px" });
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [0, 1000], [0, 5], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`);
  const direction = useRef(1);

  // Same idea as Framer Motion's "scroll velocity" example.
  useAnimationFrame((_, delta) => {
    if (!fx || !visible) return;
    const f = factor.get();
    if (f < 0) direction.current = -1;
    else if (f > 0) direction.current = 1;
    let move = direction.current * baseVelocity * (delta / 1000);
    move += direction.current * move * f;
    baseX.set(baseX.get() + move);
  });

  const copy = (
    <span className="flex shrink-0 items-center gap-[0.4em] pr-[0.4em]">
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="flex items-center gap-[0.4em]">
          <span className={i % 2 ? "text-gradient" : "text-outline"}>{w}</span>
          <span className="text-primary/60">✦</span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("relative overflow-hidden border-y border-line bg-black/40 py-5 select-none", className)}
    >
      <motion.div
        className="flex w-max font-display text-[clamp(2.5rem,7vw,6rem)] leading-none font-black tracking-[0.06em] whitespace-nowrap uppercase"
        style={{ x: fx ? x : "-25%" }}
      >
        {copy}
        {copy}
        {copy}
        {copy}
      </motion.div>
    </div>
  );
}
