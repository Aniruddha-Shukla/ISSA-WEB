import { mulberry32 } from "@/lib/utils";

const W = 1200;
const H = 1000;
const STEP = 40;

// Right-angled traces snapped to a grid, generated once at build time.
const traces = (() => {
  const rand = mulberry32(1337);
  return Array.from({ length: 34 }, (_, i) => {
    let x = Math.round((rand() * W) / STEP) * STEP;
    let y = Math.round((rand() * H) / STEP) * STEP;
    const points = [[x, y]];
    const segments = 2 + Math.floor(rand() * 4);
    for (let s = 0; s < segments; s++) {
      if (rand() > 0.5) x = Math.max(0, Math.min(W, x + (rand() > 0.5 ? 1 : -1) * STEP * (2 + Math.floor(rand() * 6))));
      else y = Math.max(0, Math.min(H, y + (rand() > 0.5 ? 1 : -1) * STEP * (2 + Math.floor(rand() * 5))));
      points.push([x, y]);
    }
    return { points, warm: i % 3 === 0 };
  });
})();

/** Dramatic backdrop for the About section: glowing circuitry behind a giant shield. */
export function CircuitBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]"
      aria-hidden
    >
      <div className="absolute top-0 left-0 h-[70%] w-[65%] bg-[radial-gradient(closest-side,rgb(244_63_94/0.22),transparent)]" />
      <div className="absolute right-0 bottom-0 h-[70%] w-[65%] bg-[radial-gradient(closest-side,rgb(34_211_238/0.16),transparent)]" />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full mask-radial opacity-80"
      >
        <defs>
          <linearGradient id="about-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f43f5e" />
            <stop offset="0.5" stopColor="#e879f9" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {traces.map((t, i) => {
            const [ex, ey] = t.points[t.points.length - 1];
            return (
              <g key={i} stroke={t.warm ? "#fb7185" : "#22d3ee"} strokeOpacity={t.warm ? 0.45 : 0.3}>
                <polyline points={t.points.map((p) => p.join(",")).join(" ")} strokeWidth="1.6" />
                <circle cx={ex} cy={ey} r="5" fill="#000" strokeWidth="1.6" />
              </g>
            );
          })}
        </g>
        <path
          d="M600 170 330 275v190c0 170 115 290 270 335 155-45 270-165 270-335V275L600 170Z"
          fill="rgb(232 121 249 / 0.04)"
          stroke="url(#about-shield)"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M600 225 380 310v158c0 140 95 240 220 278 125-38 220-138 220-278V310L600 225Z"
          fill="none"
          stroke="url(#about-shield)"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeDasharray="4 10"
        />
      </svg>
    </div>
  );
}
