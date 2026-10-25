"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFx } from "./use-fx";

/** Fills its (positioned) parent; the content drifts vertically as it passes through the viewport. */
export function Parallax({ children, amount = 9, className }: { children: ReactNode; amount?: number; className?: string }) {
  const fx = useFx();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${amount}%`, `${amount}%`]);
  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* taller than the frame so the drift never reveals an edge */}
      <motion.div className="absolute inset-x-0 -top-[12%] -bottom-[12%]" style={fx ? { y } : undefined}>
        {children}
      </motion.div>
    </div>
  );
}
