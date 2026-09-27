import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id="issa-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2ef2b1" />
          <stop offset="1" stopColor="#38d9f5" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 4.5 7v8.2c0 7.3 4.9 12.4 11.5 14.3 6.6-1.9 11.5-7 11.5-14.3V7L16 2.5Z"
        fill="rgb(46 242 177 / 0.08)"
        stroke="url(#issa-logo)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m10.5 12.5 3.5 3.2-3.5 3.3"
        fill="none"
        stroke="url(#issa-logo)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16.5 19.5h5" stroke="#2ef2b1" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label={`${siteConfig.shortName} home`}>
      <LogoMark className="transition-transform duration-300 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight text-ink">{siteConfig.shortName}</span>
        <span className="mt-0.5 font-mono text-[0.6rem] tracking-[0.2em] text-faint uppercase">tech club</span>
      </span>
    </Link>
  );
}
