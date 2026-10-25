"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { siteConfig } from "@/config/site";
import { dottedName } from "@/components/layout/logo";
import { useFx } from "@/components/fx/use-fx";
import { HeroEmblem } from "./hero-emblem";

const letters = dottedName.split("");
const center = (letters.length - 1) / 2;

function Letter({ char, index, spread, fx }: { char: string; index: number; spread: MotionValue<number>; fx: boolean }) {
  // letters drift apart from the middle as the hero scrolls away
  const x = useTransform(spread, (v) => `${(index - center) * v * 0.32}em`);
  return (
    // each letter carries its own chrome gradient: a parent's background-clip:text
    // doesn't follow children that move on their own layer
    <motion.span className="inline-block text-chrome" style={fx ? { x } : undefined}>
      {char}
    </motion.span>
  );
}

/** Tagline, emblem and the giant I.S.S.A letters, with a cinematic scroll-away. */
export function HeroStage() {
  const fx = useFx();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const p = scrollYProgress;

  const taglineY = useTransform(p, [0, 1], [0, -90]);
  const taglineOpacity = useTransform(p, [0, 0.35], [1, 0]);
  const emblemScale = useTransform(p, [0, 1], [1, 1.5]);
  const emblemRotate = useTransform(p, [0, 1], [0, 40]);
  const emblemY = useTransform(p, [0, 1], ["0%", "-22%"]);
  const emblemOpacity = useTransform(p, [0, 0.7], [1, 0]);
  const lettersY = useTransform(p, [0, 1], ["0%", "45%"]);
  const lettersOpacity = useTransform(p, [0.25, 0.95], [1, 0]);
  const subtitleOpacity = useTransform(p, [0, 0.3], [1, 0]);

  return (
    <div ref={ref} className="flex flex-col items-center pt-8 text-center sm:pt-12">
      <motion.p
        style={fx ? { y: taglineY, opacity: taglineOpacity } : undefined}
        className="font-display text-[0.65rem] font-semibold tracking-[0.3em] text-gold uppercase motion-safe:animate-fade-up sm:text-sm"
      >
        {/* wraps between the two phrases on phones instead of mid-name */}
        <span className="inline-block">Cybersecurity &amp; Tech Club</span>
        <span className="hidden sm:inline"> · </span> <span className="inline-block">{siteConfig.college}</span>
      </motion.p>

      <motion.div
        className="mt-8 sm:mt-10"
        style={fx ? { scale: emblemScale, rotate: emblemRotate, y: emblemY, opacity: emblemOpacity } : undefined}
      >
        <HeroEmblem />
      </motion.div>

      <h1 id="hero-title" className="relative z-10 -mt-6 w-full sm:-mt-8">
        <span className="sr-only">
          {siteConfig.shortName} — {siteConfig.fullName}
        </span>
        <motion.span
          aria-hidden
          style={fx ? { y: lettersY, opacity: lettersOpacity } : undefined}
          className="block pl-[0.2em] font-display text-[clamp(3.1rem,15.5vw,13.5rem)] leading-none font-black tracking-[0.2em] whitespace-nowrap select-none"
        >
          {letters.map((char, i) => (
            <Letter key={i} char={char} index={i} spread={p} fx={fx} />
          ))}
        </motion.span>
      </h1>
      <motion.p
        style={fx ? { opacity: subtitleOpacity } : undefined}
        className="mt-3 font-display text-[0.62rem] tracking-[0.35em] text-muted uppercase sm:text-xs"
      >
        {siteConfig.fullName} · {siteConfig.chapter}
      </motion.p>
    </div>
  );
}
