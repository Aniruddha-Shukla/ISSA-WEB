"use client";

import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useFx } from "./use-fx";

/**
 * Moves one tiled star layer up at a fraction of the scroll speed. The layer is one
 * tile taller than the screen and the offset wraps every tile, so it never runs out.
 */
export function StarLayer({ factor, tile, children }: { factor: number; tile: number; children: ReactNode }) {
  const fx = useFx();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (v) => -((v * factor) % tile));
  return (
    <motion.div className="absolute inset-x-0 top-0" style={{ height: `calc(100% + ${tile}px)`, y: fx ? y : 0 }}>
      {children}
    </motion.div>
  );
}
