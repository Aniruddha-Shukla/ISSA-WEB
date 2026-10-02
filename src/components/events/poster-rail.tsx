"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal, snap-scrolling carousel. Items are server-rendered <li>s passed as children. */
export function PosterRail({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setOverflowing(el.scrollWidth > el.clientWidth + 4));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scroll = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };

  const buttonClass =
    "flex size-11 items-center justify-center rounded-full border border-line-strong bg-black/60 text-muted transition-colors hover:border-primary/60 hover:text-primary";

  return (
    <div>
      {/* bleeds to the viewport edges; the padding keeps the first poster aligned with the page container */}
      <ul
        ref={ref}
        aria-label={label}
        className="mx-[calc(50%-50vw)] flex snap-x snap-mandatory scroll-px-[max(1rem,calc(50vw-38rem))] [scrollbar-width:thin] gap-5 overflow-x-auto px-[max(1rem,calc(50vw-38rem))] pt-2 pb-6 [&>li:first-child]:ml-auto [&>li:last-child]:mr-auto"
      >
        {children}
      </ul>
      {overflowing ? (
        <div className="mt-2 flex justify-center gap-3">
          <button type="button" className={buttonClass} onClick={() => scroll(-1)} aria-label={`Scroll ${label} back`}>
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" className={buttonClass} onClick={() => scroll(1)} aria-label={`Scroll ${label} forward`}>
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
