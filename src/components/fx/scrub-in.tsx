"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFx } from "./use-fx";

/**
 * Slides its content in from one side, tied to scroll position (scrubbing back up
 * reverses it). The outer element is measured, the inner one moves.
 */
export function ScrubIn({
  from = "left",
  className,
  children,
}: {
  from?: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const fx = useFx();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.62"] });
  const sign = from === "left" ? -1 : 1;
  const x = useTransform(scrollYProgress, [0, 1], [`${sign * 18}%`, "0%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [sign * -3, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.55, 1], [0, 0.8, 1]);

  return (
    <div ref={ref} className={className}>
      <motion.div className={cn("h-full")} style={fx ? { x, rotate, scale, opacity } : undefined}>
        {children}
      </motion.div>
    </div>
  );
}
