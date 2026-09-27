import Image from "next/image";
import { cn } from "@/lib/utils";

const OPTIMIZED_HOSTS = [
  /\.supabase\.co$/,
  /^i\.ytimg\.com$/,
  /^img\.youtube\.com$/,
  /^lh3\.googleusercontent\.com$/,
  /^avatars\.githubusercontent\.com$/,
];

function canOptimize(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const { hostname } = new URL(src);
    return OPTIMIZED_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

/**
 * next/image for hosts configured in next.config.ts (resized, lazy, modern
 * formats); plain lazy <img> for anything an admin pastes from elsewhere.
 */
export function SmartImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (canOptimize(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-provided hosts can't be allow-listed
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
