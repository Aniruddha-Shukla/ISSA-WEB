import { cn, hashString, initials } from "@/lib/utils";

const gradients = [
  "from-primary/80 to-cyan/70",
  "from-accent/80 to-cyan/70",
  "from-primary/80 to-accent/70",
  "from-pink-400/80 to-accent/70",
  "from-cyan/80 to-blue-400/70",
  "from-amber-300/80 to-pink-400/70",
];

export function Avatar({
  name,
  src,
  className,
  size = 40,
}: {
  name: string | null | undefined;
  src?: string | null;
  className?: string;
  size?: number;
}) {
  const label = name ?? "User";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary OAuth hosts
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-line-strong", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold text-on-primary ring-1 ring-white/10",
        gradients[hashString(label) % gradients.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
    >
      {initials(label)}
    </span>
  );
}
