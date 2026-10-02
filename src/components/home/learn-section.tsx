import { ArrowRight } from "lucide-react";
import type { LearningResource } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { ResourceCard } from "@/components/learning/resource-card";

export function LearnSection({ resources }: { resources: LearningResource[] }) {
  if (resources.length === 0) return null;
  const featured = resources.filter((r) => r.is_featured);
  const picks = (featured.length >= 3 ? featured : [...featured, ...resources.filter((r) => !r.is_featured)]).slice(0, 6);

  return (
    <section id="learn" aria-labelledby="learn-title" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="learn-title"
          kicker="05 · Start learning today"
          title="Learn"
          description="Roadmaps, courses and practice platforms the core team actually used — from your first Linux command to your first CTF flag."
        />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((r, i) => (
            <Reveal as="li" key={r.id} delay={(i % 3) * 0.06} className="h-full">
              <ResourceCard resource={r} />
            </Reveal>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <ButtonLink href="/learn" variant="neon" className="px-6 font-display text-[0.7rem] tracking-[0.18em] uppercase">
            Open the learning hub <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
