import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fish, Flag, Swords } from "lucide-react";
import { getChallenges } from "@/lib/data/public";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { TiltCard } from "@/components/fx/tilt-card";
import { PlayRules } from "@/components/play/rules";
import { Scoreboard } from "@/components/play/scoreboard";
import { phishingEmails } from "@/content/phishing";

export const metadata: Metadata = {
  title: "Play",
  description: "Cybersecurity games: find the flags hidden on this website, spot phishing emails and solve CTF challenges.",
};

export const revalidate = 60;

export default async function PlayPage() {
  const challenges = await getChallenges();
  const hunt = challenges.filter((c) => c.kind === "hunt");
  const arena = challenges.filter((c) => c.kind === "arena");
  const games = [
    {
      href: "/play/flag-hunt",
      icon: Flag,
      title: "Flag hunt",
      stat: `${hunt.length} flags hidden`,
      text: "Flags are hidden around this very website: in the page source, the console, the headers… Can you find them all?",
    },
    {
      href: "/play/phishing",
      icon: Fish,
      title: "Phishing Spotter",
      stat: `${phishingEmails.length} emails`,
      text: "A fake inbox full of real tricks. Inspect senders and links, call out the phish, and learn every red flag.",
    },
    {
      href: "/play/ctf",
      icon: Swords,
      title: "CTF arena",
      stat: `${arena.length} challenges · ${arena.reduce((sum, c) => sum + c.points, 0)} pts`,
      text: "Crypto, web, forensics and OSINT puzzles. Find the flag, submit it, climb the scoreboard.",
    },
  ];

  return (
    <Container className="py-12 sm:py-16">
      <SectionHeading
        as="h1"
        kicker="Learn by breaking things (safely)"
        title="Play"
        description="Three ways to practise real security skills right in your browser. Sign in to save your progress and get on the scoreboard."
      />
      <ul className="grid gap-6 lg:grid-cols-3">
        {games.map((g) => (
          <li key={g.href}>
            <TiltCard max={5} glareClassName="chamfer [--chamfer:26px]">
              <Link href={g.href} className="group block h-full">
                <ChamferFrame size={26} tone="neon" className="h-full" innerClassName="flex h-full flex-col bg-surface/95 p-7">
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                    <g.icon className="size-7" aria-hidden />
                  </span>
                  <h2 className="mt-6 font-display text-2xl font-extrabold tracking-[0.08em] text-ink uppercase">{g.title}</h2>
                  <p className="mt-1 font-mono text-xs tracking-[0.14em] text-gold uppercase">{g.stat}</p>
                  <p className="mt-4 flex-1 leading-relaxed text-muted">{g.text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-display text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                    Play <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </ChamferFrame>
              </Link>
            </TiltCard>
          </li>
        ))}
      </ul>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Scoreboard />
        <PlayRules />
      </div>
    </Container>
  );
}
