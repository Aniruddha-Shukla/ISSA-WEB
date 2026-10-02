import { mulberry32 } from "@/lib/utils";

/**
 * Fixed deep-space backdrop. Three tiled SVG star layers (no images, no
 * canvas, no JS); two of them twinkle via opacity only, which the browser
 * composites on the GPU, so it stays cheap on low-end phones.
 */

type Star = { x: number; y: number; r: number; o: number };

function stars(seed: number, count: number, tile: number, [rMin, rMax]: [number, number]): Star[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: Math.round(rand() * tile * 10) / 10,
    y: Math.round(rand() * tile * 10) / 10,
    r: Math.round((rMin + rand() * (rMax - rMin)) * 100) / 100,
    o: Math.round((0.35 + rand() * 0.65) * 100) / 100,
  }));
}

const layers = [
  { id: "stars-far", tile: 360, stars: stars(7, 70, 360, [0.35, 0.8]), className: "" },
  { id: "stars-mid", tile: 640, stars: stars(21, 46, 640, [0.7, 1.2]), className: "motion-safe:animate-twinkle" },
  {
    id: "stars-near",
    tile: 980,
    stars: stars(42, 22, 980, [1.1, 1.7]),
    className: "motion-safe:animate-twinkle [animation-delay:-2s] [animation-duration:6s]",
  },
];

export function Starfield() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {layers.map((layer) => (
        <svg key={layer.id} className={`absolute inset-0 size-full will-change-[opacity] ${layer.className}`}>
          <defs>
            <pattern id={layer.id} width={layer.tile} height={layer.tile} patternUnits="userSpaceOnUse">
              {layer.stars.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" fillOpacity={s.o} />
              ))}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${layer.id})`} />
        </svg>
      ))}
      {/* faint nebulae */}
      <div className="absolute -top-[30vh] left-1/2 h-[80vh] w-[110vw] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(34_211_238/0.07),transparent)]" />
      <div className="absolute top-[35vh] -right-[30vw] h-[80vh] w-[75vw] bg-[radial-gradient(closest-side,rgb(232_121_249/0.06),transparent)]" />
    </div>
  );
}
