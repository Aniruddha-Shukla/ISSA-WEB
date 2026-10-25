"use client";

import { motion, useScroll } from "framer-motion";

/** Thin neon bar along the top edge showing how far down the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-primary via-accent to-gold shadow-[0_0_12px_rgb(34_211_238/0.8)]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
