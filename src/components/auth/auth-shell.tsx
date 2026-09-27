import type { ReactNode } from "react";
import { ShieldCheck, Ticket, Trophy } from "lucide-react";
import { siteConfig } from "@/config/site";
import { LogoMark } from "@/components/layout/logo";

const perks = [
  { icon: Ticket, text: "One-click event registration with QR tickets" },
  { icon: Trophy, text: "Live quizzes, leaderboards and badges" },
  { icon: ShieldCheck, text: "Members-only CTFs, labs and study groups" },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="relative hidden overflow-hidden rounded-3xl border border-line bg-surface p-10 lg:block">
        <div className="absolute inset-0 bg-grid mask-radial opacity-60" aria-hidden />
        <div className="absolute -top-20 -left-20 size-72 rounded-full bg-primary/20 blur-[90px]" aria-hidden />
        <div className="absolute -right-16 -bottom-24 size-72 rounded-full bg-accent/20 blur-[90px]" aria-hidden />
        <div className="relative">
          <LogoMark className="size-12" />
          <p className="mt-8 font-mono text-xs tracking-[0.22em] text-primary uppercase">{siteConfig.fullName}</p>
          <p className="mt-4 font-display text-4xl leading-tight font-bold text-ink">
            {siteConfig.tagline.split(" ").map((w, i) => (
              <span key={w} className={i === 0 ? "text-gradient" : undefined}>
                {w}{" "}
              </span>
            ))}
          </p>
          <ul className="mt-10 space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-muted">
                <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-12 font-mono text-xs text-faint">
            <span className="text-primary">$</span> ssh you@{siteConfig.shortName.toLowerCase()}.club{" "}
            <span className="animate-blink">▌</span>
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
