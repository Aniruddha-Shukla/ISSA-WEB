import Link from "next/link";
import { ArrowRight, Fish, Flag, Swords } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/section-heading";

const games = [
  {
    href: "/play/flag-hunt",
    icon: Flag,
    title: "Flag hunt",
    text: "Flags are hidden on this very website. This page is a good place to start…",
  },
  {
    href: "/play/phishing",
    icon: Fish,
    title: "Phishing Spotter",
    text: "Real tricks in a fake inbox. Can you spot every red flag?",
  },
  {
    href: "/play/ctf",
    icon: Swords,
    title: "CTF arena",
    text: "Crypto, web, forensics and OSINT puzzles with a live scoreboard.",
  },
];

export function PlaySection() {
  return (
    <section id="play" aria-labelledby="play-title" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="play-title"
          kicker="07 · Think you can hack it?"
          title="Play"
          description="Practise real security skills right in your browser, and get your name on the scoreboard."
        />
        <ul className="grid gap-5 md:grid-cols-3">
          {games.map((g) => (
            <li key={g.href}>
              <Link
                href={g.href}
                className="group flex h-full flex-col rounded-3xl p-6 transition-[border-color,box-shadow] glass hover:border-primary/50 hover:shadow-[0_0_30px_-12px_rgb(34_211_238/0.6)]"
              >
                <g.icon className="size-7 text-primary" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-bold tracking-[0.08em] text-ink uppercase">{g.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{g.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-display text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
                  Play <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/play" variant="neon" className="px-6 font-display text-[0.7rem] tracking-[0.18em] uppercase">
            Enter the arena <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
