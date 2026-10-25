"use client";

import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFx, useMedia } from "@/components/fx/use-fx";
import { PosterRail } from "./poster-rail";

/** Same left inset as the page container, so the first poster lines up with the heading. */
const INSET = "px-[max(1rem,calc(50vw-38rem))]";

/**
 * Desktop: the section pins and vertical scrolling moves the posters sideways
 * (1px of scroll = 1px of travel). Phones, tablets and reduced-motion visitors get
 * the normal swipeable rail. Items are server-rendered <li>s passed as children.
 */
export function EventTrack({ label, children }: { label: string; children: ReactNode }) {
  const fx = useFx();
  const desktop = useMedia("(min-width: 1024px)");
  if (!fx || !desktop) return <PosterRail label={label}>{children}</PosterRail>;
  return <PinnedTrack label={label}>{children}</PinnedTrack>;
}

function PinnedTrack({ label, children }: { label: string; children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;
    const observer = new ResizeObserver(() => setDistance(Math.max(0, track.scrollWidth - viewport.clientWidth)));
    observer.observe(track);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (v) => -v * distance);

  // Keyboard users: when focus lands on an off-screen poster, scroll the page to the
  // point where the track shows it (instead of the browser shifting the clipped row).
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const wrap = wrapRef.current;
    const item = (e.target as HTMLElement).closest("li");
    if (!viewport || !wrap || !item || !distance) return;
    viewport.scrollLeft = 0;
    const progress = Math.min(1, Math.max(0, (item.offsetLeft - viewport.clientWidth / 3) / distance));
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + progress * distance });
  };

  return (
    <div
      ref={wrapRef}
      onFocus={onFocus}
      className="relative mx-[calc(50%-50vw)]"
      style={{ height: distance ? `calc(100vh + ${distance}px)` : undefined }}
    >
      <div
        ref={viewportRef}
        className={cn("overflow-hidden", distance ? "sticky top-0 flex h-screen flex-col justify-center pt-16" : "py-2")}
      >
        <motion.ul
          ref={trackRef}
          aria-label={label}
          style={distance ? { x } : undefined}
          className={cn("flex w-max gap-6", INSET, !distance && "mx-auto")}
        >
          {children}
        </motion.ul>
        {distance ? (
          <div className={cn("mt-8 flex items-center gap-4", INSET)} aria-hidden>
            <span className="font-mono text-[0.65rem] tracking-[0.2em] text-faint uppercase">Scroll</span>
            <div className="h-px flex-1 overflow-hidden bg-line">
              <motion.div
                className="h-full origin-left bg-gradient-to-r from-primary to-accent"
                style={{ scaleX: scrollYProgress }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
