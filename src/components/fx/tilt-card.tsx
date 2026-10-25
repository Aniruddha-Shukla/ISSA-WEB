"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFx, useMedia } from "./use-fx";

/**
 * Tilts toward the cursor in 3D with a soft light that follows the pointer.
 * Mouse/trackpad only — touch devices and reduced-motion visitors get the plain card.
 */
export function TiltCard({
  children,
  className,
  glareClassName,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  /** e.g. the card's clip-path class, so the light stays inside the card's shape */
  glareClassName?: string;
  max?: number;
}) {
  const fx = useFx();
  const finePointer = useMedia("(hover: hover) and (pointer: fine)");
  const active = fx && finePointer;
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 });
  const glare = useMotionTemplate`radial-gradient(360px circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.16), transparent 55%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
    glareOpacity.set(1);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  if (!active) return <div className={cn("h-full", className)}>{children}</div>;

  return (
    <div className={cn("h-full [perspective:900px]", className)}>
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative h-full"
        style={{ rotateX, rotateY }}
      >
        {children}
        <motion.div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 z-10", glareClassName)}
          style={{ background: glare, opacity: glareOpacity }}
        />
      </motion.div>
    </div>
  );
}
