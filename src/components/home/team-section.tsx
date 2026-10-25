import { teamPods } from "@/config/site";
import type { TeamMember } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { EmptyState } from "@/components/ui/feedback";
import { Reveal } from "@/components/ui/reveal";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { PodPanel, type Pod } from "./pod-panel";
import { MemberCard, TierHeading } from "./team-cards";

const podNames: string[] = teamPods.map((p) => p.name);

/** Pods in the configured order, then any others admins typed in. */
const podRank = (name: string | null) => {
  const i = name ? podNames.indexOf(name) : -1;
  return i === -1 ? podNames.length : i;
};

export function TeamSection({ team }: { team: TeamMember[] }) {
  const tenure = team.find((m) => m.tenure)?.tenure;
  const leads = team.filter((m) => m.tier === "lead").sort((a, b) => podRank(a.domain) - podRank(b.domain));
  // One group: office bearers (in admin order), then each pod's lead.
  const leadership = [...team.filter((m) => m.tier !== "lead" && m.tier !== "core"), ...leads];

  // Every configured pod is shown, even before its core members are added.
  const extraPods = [...new Set(team.map((m) => m.domain).filter((d): d is string => !!d && !podNames.includes(d)))];
  const pods: Pod[] = [
    ...teamPods.map((p) => ({ name: p.name, icon: p.icon, description: p.description })),
    ...extraPods.map((name) => ({ name, icon: "users", description: undefined })),
  ].map((p) => ({
    ...p,
    id: slugify(p.name),
    lead: leads.find((m) => m.domain === p.name),
    members: team.filter((m) => m.tier === "core" && m.domain === p.name),
  }));
  const unassigned = team.filter((m) => m.tier === "core" && !m.domain);
  if (unassigned.length) pods.push({ id: "general", name: "General", icon: "users", members: unassigned });

  return (
    <section id="team" aria-labelledby="team-title" className="relative py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="team-title"
          kicker={tenure ? `02 · The core committee · ${tenure}` : "02 · The core committee"}
          title="Our team"
          description="The students who plan the events, build the platform and keep the club running. Reach out to any of us."
        />
        {team.length === 0 ? (
          <EmptyState title="Team coming soon" description="The team will appear here once it is added in the admin dashboard." />
        ) : (
          <div className="space-y-20">
            {leadership.length ? (
              <section aria-labelledby="team-leadership">
                <TierHeading id="team-leadership">Office bearers &amp; leads</TierHeading>
                <ul className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  {leadership.map((m, i) => (
                    <Reveal as="li" key={m.id} delay={(i % 4) * 0.06} className="w-[calc(50%-0.5rem)] sm:w-[17rem]">
                      <MemberCard member={m} />
                    </Reveal>
                  ))}
                </ul>
              </section>
            ) : null}

            {pods.length ? (
              <section aria-labelledby="team-pods">
                <TierHeading id="team-pods">Our pods</TierHeading>
                <ul className="grid gap-6 lg:grid-cols-2">
                  {pods.map((pod, i) => (
                    <Reveal as="li" key={pod.id} delay={(i % 2) * 0.06} className="h-full">
                      <PodPanel pod={pod} />
                    </Reveal>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </Container>
    </section>
  );
}
