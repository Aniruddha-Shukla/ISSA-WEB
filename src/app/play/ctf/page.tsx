import type { Metadata } from "next";
import { getChallenges } from "@/lib/data/public";
import { EmptyState } from "@/components/ui/feedback";
import { Markdown } from "@/components/ui/markdown";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { ArenaBoard } from "@/components/play/arena-board";
import { PlayRules } from "@/components/play/rules";
import { Scoreboard } from "@/components/play/scoreboard";

export const metadata: Metadata = {
  title: "CTF arena",
  description: "Capture-the-flag challenges in crypto, web, forensics, OSINT and more, with a live scoreboard.",
};

export const revalidate = 60;

export default async function ArenaPage() {
  const arena = (await getChallenges()).filter((c) => c.kind === "arena");
  return (
    <Container className="py-12 sm:py-16">
      <SectionHeading
        as="h1"
        kicker="Capture the flag"
        title="CTF arena"
        description="Pick a challenge, find the hidden ISSA{...} flag and submit it. Free tools like CyberChef and your browser's developer tools will take you a long way."
      />
      {arena.length ? (
        <ArenaBoard items={arena.map((c) => ({ challenge: c, description: <Markdown>{c.description}</Markdown> }))} />
      ) : (
        <EmptyState title="The arena is being set up" description="Challenges will appear here soon." />
      )}
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Scoreboard />
        <PlayRules />
      </div>
    </Container>
  );
}
