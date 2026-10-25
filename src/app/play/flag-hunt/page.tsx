import type { Metadata } from "next";
import { getChallenges } from "@/lib/data/public";
import { EmptyState } from "@/components/ui/feedback";
import { Markdown } from "@/components/ui/markdown";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { HuntBoard } from "@/components/play/hunt-board";
import { PlayRules } from "@/components/play/rules";
import { Scoreboard } from "@/components/play/scoreboard";

export const metadata: Metadata = {
  title: "Flag hunt",
  description: "Flags are hidden around the ISSA website. Find them all and earn the Flag Hunter badge.",
};

export const revalidate = 60;

export default async function FlagHuntPage() {
  const hunt = (await getChallenges()).filter((c) => c.kind === "hunt");
  return (
    <Container className="py-12 sm:py-16">
      <SectionHeading
        as="h1"
        kicker="Recon starts here"
        title="Flag hunt"
        description={`${hunt.length} flags are hidden around this website, each shaped like ISSA{...}. All you need is your browser and curiosity. Find them all for the Flag Hunter badge.`}
      />
      {hunt.length ? (
        <HuntBoard items={hunt.map((c) => ({ challenge: c, description: <Markdown>{c.description}</Markdown> }))} />
      ) : (
        <EmptyState title="The hunt hasn't started yet" description="Flags will appear here soon." />
      )}
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Scoreboard />
        <PlayRules />
      </div>
    </Container>
  );
}
