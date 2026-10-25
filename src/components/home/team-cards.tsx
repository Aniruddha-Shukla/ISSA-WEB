import { Mail } from "lucide-react";
import type { TeamMember } from "@/lib/types";
import { cn, initials, isSafeHttpUrl } from "@/lib/utils";
import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon } from "@/components/ui/brand-icons";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { GenerativeArt } from "@/components/ui/generative-art";
import { SmartImage } from "@/components/ui/smart-image";

export function SocialLinks({ member, small }: { member: TeamMember; small?: boolean }) {
  const links = [
    { href: member.linkedin_url, label: "LinkedIn", icon: LinkedinIcon },
    { href: member.github_url, label: "GitHub", icon: GithubIcon },
    { href: member.twitter_url, label: "X", icon: XIcon },
    { href: member.instagram_url, label: "Instagram", icon: InstagramIcon },
  ].filter((l) => isSafeHttpUrl(l.href));
  if (!links.length && !member.email) return null;

  const itemClass = cn(
    "flex items-center justify-center rounded-full border border-line-strong text-muted transition-colors hover:border-primary/50 hover:text-primary",
    small ? "size-7" : "size-8",
  );
  const iconSize = small ? 13 : 15;
  return (
    <ul className="flex justify-center gap-1.5" aria-label={`${member.name} on social media`}>
      {links.map(({ href, label, icon: Icon }) => (
        <li key={label}>
          <a
            href={href!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on ${label}`}
            className={itemClass}
          >
            <Icon size={iconSize} />
          </a>
        </li>
      ))}
      {member.email ? (
        <li>
          <a href={`mailto:${member.email}`} aria-label={`Email ${member.name}`} className={itemClass}>
            <Mail style={{ width: iconSize, height: iconSize }} />
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/** Corner-cut profile card for office bearers and pod leads. */
export function MemberCard({ member }: { member: TeamMember }) {
  return (
    <ChamferFrame
      size={26}
      tone="gold"
      className="group h-full transition-[filter] duration-300 hover:drop-shadow-[0_0_18px_rgb(34_211_238/0.35)]"
      innerClassName="flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden">
        {member.photo_url ? (
          <SmartImage
            src={member.photo_url}
            alt={`Photo of ${member.name}`}
            sizes="(min-width: 640px) 272px, 50vw"
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
      <div className="flex flex-1 flex-col px-3 pb-5 text-center sm:px-5 sm:pb-6">
        <h4 className="font-display text-sm font-bold tracking-[0.06em] text-ink uppercase sm:text-lg">{member.name}</h4>
        <p className="mt-1.5 font-display text-[0.56rem] font-semibold tracking-[0.14em] text-gold uppercase sm:text-[0.62rem] sm:tracking-[0.2em]">
          {member.designation}
        </p>
        {member.bio ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{member.bio}</p> : null}
        <div className="mt-auto pt-5">
          <SocialLinks member={member} />
        </div>
      </div>
    </ChamferFrame>
  );
}

/** Centered "── OFFICE BEARERS & LEADS ──" divider between the groups. */
export function TierHeading({ id, children }: { id: string; children: string }) {
  return (
    <h3
      id={id}
      className="mb-8 flex items-center gap-4 font-display text-xs font-bold tracking-[0.3em] text-gold uppercase sm:text-sm"
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/40" aria-hidden />
      {children}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/40" aria-hidden />
    </h3>
  );
}
