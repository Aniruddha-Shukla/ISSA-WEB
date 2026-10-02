import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { PublicStats } from "@/lib/data/public";
import type { ClubEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { Container } from "@/components/ui/section-heading";
import { dottedName } from "@/components/layout/logo";
import { HeroEmblem } from "./hero-emblem";

export function Hero({ stats, nextEvent }: { stats: PublicStats; nextEvent?: ClubEvent }) {
  const statItems = [
    { label: "Members", value: stats.members },
    { label: "Events hosted", value: stats.events },
    { label: "Projects", value: stats.projects },
    { label: "Wins & honours", value: stats.achievements },
  ];

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <Container className="flex flex-col items-center pt-8 text-center sm:pt-12">
        <p className="font-display text-[0.65rem] font-semibold tracking-[0.3em] text-gold uppercase motion-safe:animate-fade-up sm:text-sm">
          Cybersecurity &amp; Tech Club · {siteConfig.college}
        </p>

        <HeroEmblem className="mt-8 sm:mt-10" />

        <h1 id="hero-title" className="relative z-10 -mt-6 w-full sm:-mt-8">
          <span className="sr-only">
            {siteConfig.shortName} — {siteConfig.fullName}
          </span>
          <span
            aria-hidden
            className="block text-chrome pl-[0.2em] font-display text-[clamp(3.1rem,15.5vw,13.5rem)] leading-none font-black tracking-[0.2em] drop-shadow-[0_8px_40px_rgb(0_0_0/0.9)] select-none"
          >
            {dottedName}
          </span>
        </h1>
        <p className="mt-3 font-display text-[0.62rem] tracking-[0.35em] text-muted uppercase sm:text-xs">
          {siteConfig.fullName} · {siteConfig.chapter}
        </p>
      </Container>

      <Container className="mt-14 sm:mt-20">
        <div className="grid items-center gap-12 border-t border-line pt-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-center lg:text-left">
            <p className="font-display text-2xl font-bold tracking-[0.14em] text-ink uppercase sm:text-3xl">
              Hack. <span className="text-gradient">Defend.</span> Build<span className="text-primary">_</span>
            </p>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
              The cybersecurity &amp; tech club at {siteConfig.college}. Hands-on workshops, CTFs, hackathons and live quiz nights
              — plus open-source security tools we build together.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <ButtonLink
                href="/events"
                size="lg"
                variant="neon"
                className="px-7 font-display text-xs tracking-[0.18em] uppercase"
              >
                Explore events <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink
                href="/signup"
                size="lg"
                variant="outline"
                className="px-7 font-display text-xs tracking-[0.18em] uppercase"
              >
                Join the club
              </ButtonLink>
            </div>
          </div>

          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 sm:gap-4">
              {statItems.map((item) => (
                <ChamferFrame key={item.label} size={18} innerClassName="bg-surface/90 px-5 py-4 sm:px-6 sm:py-5">
                  <dt className="font-display text-[0.6rem] tracking-[0.22em] text-gold uppercase">{item.label}</dt>
                  <dd className="mt-1.5 text-chrome font-display text-3xl font-bold sm:text-4xl">
                    {item.value.toLocaleString("en-IN")}
                    {item.value >= 10 ? <span className="text-primary">+</span> : null}
                  </dd>
                </ChamferFrame>
              ))}
            </dl>

            {nextEvent ? (
              <Link
                href={`/events/${nextEvent.slug}`}
                className="group flex items-center gap-4 rounded-2xl glass p-4 transition-colors hover:border-primary/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-display text-[0.6rem] tracking-[0.22em] text-gold uppercase">Next up</span>
                  <span className="block truncate font-medium text-ink">{nextEvent.title}</span>
                  <span className="block text-sm text-muted">{formatDateTime(nextEvent.starts_at)}</span>
                </span>
                <ArrowRight
                  className="size-4 text-faint transition-transform group-hover:translate-x-1 group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
