import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { PhishingGame } from "@/components/play/phishing-game";

export const metadata: Metadata = {
  title: "Phishing Spotter",
  description:
    "Can you tell a phishing email from a real one? Inspect senders and links, flag the red flags, and climb the leaderboard.",
};

export default function PhishingPage() {
  return (
    <Container className="py-12 sm:py-16">
      <SectionHeading
        as="h1"
        kicker="Don't take the bait"
        title="Phishing Spotter"
        description="A fake inbox full of real tricks. Inspect, flag, decide, and learn what gave each one away."
      />
      <PhishingGame />
    </Container>
  );
}
