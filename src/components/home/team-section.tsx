import { teamDomains } from "@/config/site";
import type { TeamMember } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { EmptyState } from "@/components/ui/feedback";
import { Reveal } from "@/components/ui/reveal";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { CoreTeams, type DomainGroup } from "./core-teams";
import { MemberCard, TierHeading } from "./team-cards";

const GENERAL = "General";

/** Domains in the configured order, then any others admins typed in, then "General". */
function domainRank(domain: string) {
  const i = (teamDomains as readonly string[]).indexOf(domain);
  return i === -1 ? (domain === GENERAL ? 1000 : 500) : i;
}
const byDomain = (a: string, b: string) => domainRank(a) - domainRank(b) || a.localeCompare(b);

export function TeamSection({ team }: { team: TeamMember[] }) {
  const tenure = team.find((m) => m.tenure)?.tenure;
  // One group: office bearers (in admin order), then each domain's lead.
  const leadership = [
    ...team.filter((m) => m.tier !== "lead" && m.tier !== "core"), // office bearers (or no level set yet)
    ...team.filter((m) => m.tier === "lead").sort((a, b) => byDomain(a.domain ?? GENERAL, b.domain ?? GENERAL)),
  ];

  const coreMap = new Map<string, TeamMember[]>();
  for (const m of team.filter((m) => m.tier === "core")) {
    const domain = m.domain ?? GENERAL;
    coreMap.set(domain, [...(coreMap.get(domain) ?? []), m]);
  }
  const coreGroups: DomainGroup[] = [...coreMap.entries()]
    .sort(([a], [b]) => byDomain(a, b))
    .map(([domain, members]) => ({ id: slugify(domain) || "general", domain, members }));

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
                      <MemberCard member={m} size="lg" />
                    </Reveal>
                  ))}
                </ul>
              </section>
            ) : null}

            {coreGroups.length ? (
              <section aria-labelledby="team-cores">
                <TierHeading id="team-cores">Core team</TierHeading>
                <CoreTeams groups={coreGroups} />
              </section>
            ) : null}
          </div>
        )}
      </Container>
    </section>
  );
}
