import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { PublicStats } from "@/lib/data/public";
import type { ClubEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section-heading";
import { Terminal } from "./terminal";

export function Hero({ stats, nextEvent }: { stats: PublicStats; nextEvent?: ClubEvent }) {
  const statItems = [
    { label: "Members", value: stats.members },
    { label: "Events hosted", value: stats.events },
    { label: "Projects", value: stats.projects },
    { label: "Wins & honours", value: stats.achievements },
  ];

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* backdrop */}
      <div className="absolute inset-0 -z-10 bg-grid mask-radial opacity-70" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -z-10 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/[0.13] blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute top-40 -right-40 -z-10 h-[26rem] w-[26rem] rounded-full bg-accent/[0.14] blur-[110px]"
        aria-hidden
      />

      <Container className="grid items-center gap-14 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-28">
        <div className="motion-safe:animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1 font-mono text-[0.7rem] tracking-[0.18em] text-primary uppercase">
            <Sparkles className="size-3.5" aria-hidden />
            {siteConfig.fullName}
          </p>
          <h1 id="hero-title" className="mt-6 text-5xl leading-[1.02] font-bold tracking-tight text-ink sm:text-6xl lg:text-7xl">
            <span className="text-gradient">Hack.</span> Defend.
            <br />
            Build<span className="text-primary">_</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            The cybersecurity &amp; tech club at {siteConfig.college}. Hands-on workshops, CTFs, hackathons and live quiz nights —
            plus open-source security tools we build together.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/events" size="lg">
              Explore events <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/signup" size="lg" variant="outline">
              Join the club
            </ButtonLink>
          </div>

          {nextEvent ? (
            <Link href={`/events/${nextEvent.slug}`} className="group mt-10 flex max-w-xl items-center gap-4 card card-hover p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[0.68rem] tracking-[0.18em] text-faint uppercase">Next up</span>
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

        <div className="relative">
          <div
            className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-accent/10 blur-2xl"
            aria-hidden
          />
          <Terminal nextEvent={nextEvent ? `${nextEvent.title}` : undefined} />
        </div>
      </Container>

      <Container>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {statItems.map((item) => (
            <div key={item.label} className="bg-surface px-6 py-5">
              <dt className="font-mono text-[0.68rem] tracking-[0.18em] text-faint uppercase">{item.label}</dt>
              <dd className="mt-1.5 font-display text-3xl font-semibold text-ink">
                {item.value.toLocaleString("en-IN")}
                {item.value >= 10 ? <span className="text-primary">+</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
