import { cn, hashString, mulberry32 } from "@/lib/utils";

/**
 * Deterministic "circuit board" artwork used when an event, project or photo
 * has no image yet. The same seed always renders the same picture, and it
 * costs zero network requests.
 */

const palettes: [string, string][] = [
  ["#22d3ee", "#e879f9"],
  ["#a78bfa", "#22d3ee"],
  ["#e879f9", "#f43f5e"],
  ["#38bdf8", "#818cf8"],
  ["#ffd43b", "#e879f9"],
  ["#22d3ee", "#38bdf8"],
];

export function GenerativeArt({
  seed,
  label,
  className,
  variant = "circuit",
}: {
  seed: string;
  label?: string;
  className?: string;
  variant?: "circuit" | "photo";
}) {
  const hash = hashString(seed);
  const rand = mulberry32(hash);
  const [c1, c2] = palettes[hash % palettes.length];
  const id = `g${hash.toString(36)}`;
  const W = 400;
  const H = 260;
  const step = 20;

  // right-angled traces snapped to a grid
  const traces = Array.from({ length: 9 }, () => {
    let x = Math.round((rand() * W) / step) * step;
    let y = Math.round((rand() * H) / step) * step;
    const points = [`${x},${y}`];
    const segments = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < segments; i++) {
      if (rand() > 0.5) x = Math.max(0, Math.min(W, x + (rand() > 0.5 ? 1 : -1) * step * (2 + Math.floor(rand() * 5))));
      else y = Math.max(0, Math.min(H, y + (rand() > 0.5 ? 1 : -1) * step * (2 + Math.floor(rand() * 4))));
      points.push(`${x},${y}`);
    }
    return { points: points.join(" "), end: points[points.length - 1].split(",").map(Number), color: rand() > 0.5 ? c1 : c2 };
  });

  const orbX = 80 + rand() * 240;
  const orbY = 40 + rand() * 160;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <radialGradient id={`${id}-orb`} cx={orbX / W} cy={orbY / H} r="0.75">
          <stop offset="0" stopColor={c1} stopOpacity="0.55" />
          <stop offset="0.45" stopColor={c2} stopOpacity="0.16" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-grid`} width={step} height={step} patternUnits="userSpaceOnUse">
          <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke="#94a3b8" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={variant === "photo" ? "0.55" : "0.35"} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#07070c" />
      <rect width={W} height={H} fill={`url(#${id}-grid)`} />
      <rect width={W} height={H} fill={`url(#${id}-orb)`} />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {traces.map((t, i) => (
          <g key={i}>
            <polyline points={t.points} stroke={t.color} strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx={t.end[0]} cy={t.end[1]} r="3.5" fill="#07070c" stroke={t.color} strokeWidth="1.5" />
          </g>
        ))}
      </g>
      {variant === "photo" ? (
        <g opacity="0.9">
          <circle cx={orbX} cy={orbY} r="26" fill="none" stroke={c1} strokeOpacity="0.5" />
          <circle cx={orbX} cy={orbY} r="6" fill={c1} fillOpacity="0.9" />
        </g>
      ) : null}
      <rect width={W} height={H} fill={`url(#${id}-fade)`} />
    </svg>
  );
}
