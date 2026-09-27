import { CircleCheck } from "lucide-react";
import { about, activities, pillars } from "@/content/club";
import { NamedIcon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { Container, SectionHeading } from "@/components/ui/section-heading";

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="py-24 sm:py-28">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <SectionHeading id="about-title" kicker="01 — About" title={about.headline} description={about.mission} />
            <p className="-mt-4 leading-relaxed text-muted">{about.story}</p>
            <ul className="mt-8 space-y-3">
              {activities.map((activity) => (
                <li key={activity} className="flex items-start gap-3 text-sm text-ink/90">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {activity}
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 0.08} className="group relative overflow-hidden card card-hover p-6">
                <div
                  className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100 sm:opacity-60"
                  aria-hidden
                />
                <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <NamedIcon name={pillar.icon} className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{pillar.description}</p>
                <span className="mt-5 block font-mono text-xs text-faint">0{i + 1}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
