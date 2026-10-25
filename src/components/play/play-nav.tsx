"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/play", label: "Overview" },
  { href: "/play/flag-hunt", label: "Flag hunt" },
  { href: "/play/phishing", label: "Phishing Spotter" },
  { href: "/play/ctf", label: "CTF arena" },
];

export function PlayNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Play" className="flex justify-center px-4 pt-8">
      <ul className="flex max-w-full [scrollbar-width:none] gap-1 overflow-x-auto rounded-full border border-line-strong bg-black/60 p-1">
        {tabs.map((tab) => {
          const active = tab.href === "/play" ? pathname === "/play" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-1.5 font-display text-[0.65rem] font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition-colors",
                  active ? "bg-surface-3 text-ink ring-1 ring-primary/40" : "text-muted hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
