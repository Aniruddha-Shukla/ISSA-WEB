import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import issaMark from "@/assets/brand/issa-mark.png";

/** `I.S.S.A`-style wordmark from the short name. */
export const dottedName = siteConfig.shortName.split("").join(".");

/**
 * The ISSA globe emblem (cut out of the official logo, transparent around the globe).
 * `size` is the rendered width/height in CSS pixels; keep it in step with the size class.
 */
export function LogoMark({ className, size = 36, eager }: { className?: string; size?: number; eager?: boolean }) {
  return (
    <Image
      src={issaMark}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading={eager ? "eager" : undefined}
      className={cn("size-9 object-contain", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3", className)} aria-label={`${siteConfig.shortName} home`}>
      <LogoMark eager className="size-9 transition-transform duration-300 group-hover:scale-105" />
      <span className="text-chrome font-display text-lg font-extrabold tracking-[0.18em]">{dottedName}</span>
    </Link>
  );
}
