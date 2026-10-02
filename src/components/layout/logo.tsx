import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** `I.S.S.A`-style wordmark from the short name. */
export const dottedName = siteConfig.shortName.split("").join(".");

/** Pass a distinct `gradientId` when several marks can be on screen (or hidden) at once. */
export function LogoMark({ className, gradientId = "issa-logo" }: { className?: string; gradientId?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 4.5 7v8.2c0 7.3 4.9 12.4 11.5 14.3 6.6-1.9 11.5-7 11.5-14.3V7L16 2.5Z"
        fill="rgb(34 211 238 / 0.08)"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m10.5 12.5 3.5 3.2-3.5 3.3"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16.5 19.5h5" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, gradientId }: { className?: string; gradientId?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3", className)} aria-label={`${siteConfig.shortName} home`}>
      <LogoMark gradientId={gradientId} className="size-9 transition-transform duration-300 group-hover:scale-105" />
      <span className="text-chrome font-display text-lg font-extrabold tracking-[0.18em]">{dottedName}</span>
    </Link>
  );
}
