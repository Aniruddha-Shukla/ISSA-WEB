import { Mail } from "lucide-react";
import type { TeamMember } from "@/lib/types";
import { isSafeHttpUrl } from "@/lib/utils";
import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon } from "@/components/ui/brand-icons";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { EmptyState } from "@/components/ui/feedback";
import { GenerativeArt } from "@/components/ui/generative-art";
import { Reveal } from "@/components/ui/reveal";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { SmartImage } from "@/components/ui/smart-image";
import { initials } from "@/lib/utils";

function SocialLinks({ member }: { member: TeamMember }) {
  const links = [
    { href: member.linkedin_url, label: "LinkedIn", icon: LinkedinIcon },
    { href: member.github_url, label: "GitHub", icon: GithubIcon },
    { href: member.twitter_url, label: "X", icon: XIcon },
    { href: member.instagram_url, label: "Instagram", icon: InstagramIcon },
  ].filter((l) => isSafeHttpUrl(l.href));

  return (
    <ul className="flex gap-1.5" aria-label={`${member.name} on social media`}>
      {links.map(({ href, label, icon: Icon }) => (
        <li key={label}>
          <a
            href={href!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on ${label}`}
            className="flex size-8 items-center justify-center rounded-full border border-line-strong text-muted transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Icon size={15} />
          </a>
        </li>
      ))}
      {member.email ? (
        <li>
          <a
            href={`mailto:${member.email}`}
            aria-label={`Email ${member.name}`}
            className="flex size-8 items-center justify-center rounded-full border border-line-strong text-muted transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Mail className="size-[15px]" />
          </a>
        </li>
      ) : null}
    </ul>
  );
}

export function TeamSection({ team }: { team: TeamMember[] }) {
  const tenure = team.find((m) => m.tenure)?.tenure;
  return (
    <section id="team" aria-labelledby="team-title" className="relative py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="team-title"
          kicker={tenure ? `02 · The core committee · ${tenure}` : "02 · The core committee"}
          title="Office bearers"
          description="The students who plan the events, build the platform and keep the lab running. Reach out to any of us."
        />
        {team.length === 0 ? (
          <EmptyState
            title="Team coming soon"
            description="Office bearers will appear here once they are added in the admin dashboard."
          />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, i) => (
              <Reveal as="li" key={member.id} delay={(i % 4) * 0.06} className="group h-full">
                <ChamferFrame
                  size={24}
                  className="h-full transition-[filter] duration-300 group-hover:drop-shadow-[0_0_18px_rgb(34_211_238/0.35)]"
                  innerClassName="flex flex-col"
                >
                  <div className="relative aspect-square overflow-hidden">
                    {member.photo_url ? (
                      <SmartImage
                        src={member.photo_url}
                        alt={`Photo of ${member.name}`}
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <>
                        <GenerativeArt seed={member.name} className="transition-transform duration-500 group-hover:scale-105" />
                        <span
                          className="absolute inset-0 flex items-center justify-center text-chrome font-display text-5xl font-black tracking-widest drop-shadow-[0_2px_20px_rgb(0_0_0/0.6)]"
                          aria-hidden
                        >
                          {initials(member.name)}
                        </span>
                      </>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface to-transparent" aria-hidden />
                  </div>
                  <div className="flex flex-1 flex-col px-5 pb-6 text-center">
                    <h3 className="font-display text-lg font-bold tracking-[0.08em] text-ink uppercase">{member.name}</h3>
                    <p className="mt-1.5 font-display text-[0.65rem] font-semibold tracking-[0.22em] text-gold uppercase">
                      {member.designation}
                    </p>
                    {member.bio ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{member.bio}</p> : null}
                    <div className="mt-auto flex justify-center pt-5">
                      <SocialLinks member={member} />
                    </div>
                  </div>
                </ChamferFrame>
              </Reveal>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
