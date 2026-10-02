import { Award, BadgeCheck, ExternalLink, Flag, Newspaper, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import type { Achievement, AchievementCategory } from "@/lib/types";
import { cn, formatDate, isSafeHttpUrl } from "@/lib/utils";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { EmptyState } from "@/components/ui/feedback";
import { Reveal } from "@/components/ui/reveal";
import { Container, SectionHeading } from "@/components/ui/section-heading";

const categoryMeta: Record<AchievementCategory, { icon: LucideIcon; label: string }> = {
  hackathon: { icon: Trophy, label: "Hackathon" },
  ctf: { icon: Flag, label: "CTF" },
  certification: { icon: BadgeCheck, label: "Certification" },
  award: { icon: Award, label: "Award" },
  publication: { icon: Newspaper, label: "Publication" },
  other: { icon: Sparkles, label: "Highlight" },
};

function AchievementCard({ item, featured }: { item: Achievement; featured?: boolean }) {
  const { icon: Icon, label } = categoryMeta[item.category];
  return (
    <ChamferFrame
      size={featured ? 26 : 20}
      tone={featured ? "gold" : "default"}
      className="h-full"
      innerClassName={cn(
        "relative overflow-hidden",
        featured ? "bg-gradient-to-br from-[#1c1708] via-surface to-surface p-6 sm:p-7" : "bg-surface/95 p-5",
      )}
    >
      <article className="h-full">
        {featured ? (
          <div
            className="absolute -top-28 -right-28 size-72 bg-[radial-gradient(closest-side,rgb(255_212_59/0.14),transparent)]"
            aria-hidden
          />
        ) : null}
        <div className="relative flex items-start justify-between gap-4">
          <span
            className={
              featured
                ? "flex size-12 items-center justify-center rounded-xl bg-gold/15 text-gold"
                : "flex size-10 items-center justify-center rounded-xl bg-white/[0.05] text-primary"
            }
          >
            <Icon className={featured ? "size-6" : "size-5"} aria-hidden />
          </span>
          {item.position ? (
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 font-display text-[0.62rem] font-bold tracking-[0.16em] text-gold uppercase">
              {item.position}
            </span>
          ) : null}
        </div>
        <p className="relative mt-5 font-mono text-[0.68rem] tracking-[0.18em] text-faint uppercase">
          {label}
          {item.achieved_on ? <> · {formatDate(item.achieved_on)}</> : null}
        </p>
        <h3
          className={cn(
            "relative mt-2 font-display font-bold tracking-[0.04em] text-ink uppercase",
            featured ? "text-lg sm:text-xl" : "text-base",
          )}
        >
          {item.title}
        </h3>
        <p className="relative mt-2 text-sm text-primary/90">{item.recipients}</p>
        {item.description ? <p className="relative mt-3 text-sm leading-relaxed text-muted">{item.description}</p> : null}
        {isSafeHttpUrl(item.link_url) ? (
          <a
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-4 inline-flex items-center gap-1.5 text-sm text-cyan hover:underline"
          >
            Read more <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">about {item.title}</span>
          </a>
        ) : null}
      </article>
    </ChamferFrame>
  );
}

export function HallOfFame({ achievements }: { achievements: Achievement[] }) {
  const featured = achievements.filter((a) => a.is_featured).slice(0, 3);
  const rest = achievements.filter((a) => !featured.includes(a));

  return (
    <section id="hall-of-fame" aria-labelledby="hof-title" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="hof-title"
          kicker="06 · Wins, ranks & firsts"
          title="Hall of Fame"
          description="Hackathon trophies, CTF podiums, certifications and research — earned by ISSA members."
        />
        {achievements.length === 0 ? (
          <EmptyState
            icon={<Trophy className="size-5" />}
            title="The first trophy is up for grabs"
            description="Achievements added by the core team will be celebrated here."
          />
        ) : (
          <>
            {featured.length ? (
              <ul className="grid gap-5 lg:grid-cols-3">
                {featured.map((item, i) => (
                  <Reveal as="li" key={item.id} delay={i * 0.08} className="h-full">
                    <AchievementCard item={item} featured />
                  </Reveal>
                ))}
              </ul>
            ) : null}
            {rest.length ? (
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((item, i) => (
                  <Reveal as="li" key={item.id} delay={(i % 3) * 0.06} className="h-full">
                    <AchievementCard item={item} />
                  </Reveal>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </Container>
    </section>
  );
}
