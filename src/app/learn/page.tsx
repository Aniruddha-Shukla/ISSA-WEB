import type { Metadata } from "next";
import { getLearningResources } from "@/lib/data/public";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { LearningHub } from "@/components/learning/learning-hub";

export const metadata: Metadata = {
  title: "Learning hub",
  description:
    "Hand-picked resources from the ISSA core team: roadmaps, courses, practice platforms and tools for security and development.",
};

export const revalidate = 60;

export default async function LearnPage() {
  const resources = await getLearningResources();
  const tracks = new Set(resources.map((r) => r.track)).size;
  return (
    <Container className="py-14 sm:py-20">
      <SectionHeading
        as="h1"
        kicker="Learn"
        title="Learning hub"
        description={
          resources.length
            ? `${resources.length} resources across ${tracks} tracks, hand-picked by the core team. Start with the beginner picks in each track and work your way up.`
            : "Hand-picked resources from the core team."
        }
      />
      <LearningHub resources={resources} />
    </Container>
  );
}
