import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { about, activities, pillars } from "@/content/club";
import { cn } from "@/lib/utils";
import { NamedIcon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { CircuitBackdrop } from "./circuit-backdrop";

function GlassPanel({
  title,
  side,
  delay,
  children,
}: {
  title: string;
  side: "left" | "right";
  delay?: number;
  children: ReactNode;
}) {
  return (
    <Reveal
      delay={delay}
      className={cn(
        "rounded-3xl glass p-7 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] sm:p-9 lg:w-[64%]",
        side === "right" && "lg:self-end",
      )}
    >
      <h3 className="font-display text-xl font-bold tracking-[0.12em] text-ink uppercase sm:text-2xl">{title}</h3>
      <div className="mt-5">{children}</div>
    </Reveal>
  );
}

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative isolate py-24 sm:py-32">
      <CircuitBackdrop />
      <Container>
        <SectionHeading id="about-title" kicker="01 · Who we are" title="About us" />
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <GlassPanel title="Introduction" side="left">
            <p className="text-lg leading-relaxed text-ink">{about.headline}</p>
            <p className="mt-4 leading-relaxed text-muted">{about.mission}</p>
            <p className="mt-4 leading-relaxed text-muted">{about.story}</p>
          </GlassPanel>

          <GlassPanel title="What we do?" side="right" delay={0.05}>
            <ul className="grid gap-5 sm:grid-cols-2">
              {pillars.map((pillar) => (
                <li key={pillar.title} className="flex gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <NamedIcon name={pillar.icon} className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{pillar.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">{pillar.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>

          <GlassPanel title="What can you expect?" side="left" delay={0.05}>
            <ul className="space-y-3">
              {activities.map((activity) => (
                <li key={activity} className="flex items-start gap-3 text-ink/90">
                  <CircleCheck className="mt-1 size-4 shrink-0 text-gold" aria-hidden />
                  {activity}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      </Container>
    </section>
  );
}
