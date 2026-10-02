import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

/**
 * The hero centrepiece: a HUD-style "secure core" built from CSS + SVG.
 * Each rotating ring is its own HTML-level <svg>, so the spin is a composited
 * transform (no per-frame repaint), and everything stops for reduced motion.
 */
export function HeroEmblem({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square w-[min(74vw,25rem)]", className)} aria-hidden>
      {/* glow */}
      <div className="absolute -inset-[6%] bg-[radial-gradient(closest-side,rgb(34_211_238/0.3),transparent)]" />
      <div className="absolute inset-[12%] translate-x-[16%] translate-y-[10%] bg-[radial-gradient(closest-side,rgb(232_121_249/0.22),transparent)]" />

      {/* HUD corner brackets */}
      <span className="absolute top-0 left-0 size-8 border-t-2 border-l-2 border-primary/80" />
      <span className="absolute top-0 right-0 size-8 border-t-2 border-r-2 border-primary/80" />
      <span className="absolute bottom-0 left-0 size-8 border-b-2 border-l-2 border-accent/80" />
      <span className="absolute right-0 bottom-0 size-8 border-r-2 border-b-2 border-accent/80" />

      {/* outer ring with orbiting caption */}
      <svg viewBox="0 0 200 200" className="absolute inset-[4%] motion-safe:animate-spin-slow">
        <defs>
          <path id="emblem-orbit" d="M100,100 m-86,0 a86,86 0 1,1 172,0 a86,86 0 1,1 -172,0" />
        </defs>
        <circle cx="100" cy="100" r="94" fill="none" stroke="rgb(255 255 255 / 0.18)" strokeDasharray="1 5" />
        <text fill="rgb(255 255 255 / 0.5)" fontSize="6.4" letterSpacing="3" fontFamily="var(--font-jetbrains), monospace">
          <textPath href="#emblem-orbit">
            HACK · DEFEND · BUILD · LEARN · SHARE · HACK · DEFEND · BUILD · LEARN · SHARE ·
          </textPath>
        </text>
      </svg>

      {/* tick ring */}
      <svg viewBox="0 0 200 200" className="absolute inset-[16%] motion-safe:animate-spin-reverse">
        <defs>
          <linearGradient id="emblem-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        {TICKS.map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="4"
            x2="100"
            y2={deg % 30 === 0 ? 14 : 9}
            stroke={deg % 30 === 0 ? "#22d3ee" : "rgb(255 255 255 / 0.25)"}
            strokeWidth={deg % 30 === 0 ? 1.6 : 1}
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
        <circle
          cx="100"
          cy="100"
          r="84"
          fill="none"
          stroke="url(#emblem-arc)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="120 60 40 60 90 158"
        />
      </svg>

      {/* inner core */}
      <div className="absolute inset-[30%] rounded-full border border-white/15 bg-black/60 shadow-[inset_0_0_40px_rgb(34_211_238/0.25),0_0_60px_-10px_rgb(34_211_238/0.6)]">
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-transparent to-primary/25 motion-safe:animate-scan" />
        </div>
        <LogoMark
          gradientId="emblem-logo"
          className="absolute inset-[22%] size-auto drop-shadow-[0_0_18px_rgb(34_211_238/0.7)]"
        />
      </div>

      {/* orbiting node */}
      <div className="absolute inset-[24%] [animation-duration:9s] motion-safe:animate-spin-slow">
        <span className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_14px_3px_rgb(255_212_59/0.7)]" />
      </div>
    </div>
  );
}
