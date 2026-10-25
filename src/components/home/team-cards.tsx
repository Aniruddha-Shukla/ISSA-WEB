import { Mail } from "lucide-react";
import type { TeamMember } from "@/lib/types";
import { cn, initials, isSafeHttpUrl } from "@/lib/utils";
import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon } from "@/components/ui/brand-icons";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { GenerativeArt } from "@/components/ui/generative-art";
import { SmartImage } from "@/components/ui/smart-image";

function SocialLinks({ member, small }: { member: TeamMember; small?: boolean }) {
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

const sizes = {
  lg: { frame: 26, image: "(min-width: 640px) 272px, 50vw", name: "text-sm sm:text-lg", pad: "px-3 pb-5 sm:px-5 sm:pb-6" },
  sm: { frame: 16, image: "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw", name: "text-[0.8rem]", pad: "px-3 pb-4" },
} as const;

/** Corner-cut profile card: `lg` for office bearers and leads, `sm` for core members. */
export function MemberCard({ member, size = "lg" }: { member: TeamMember; size?: keyof typeof sizes }) {
  const s = sizes[size];
  return (
    <ChamferFrame
      size={s.frame}
      tone={size === "lg" ? "gold" : "default"}
      className="group h-full transition-[filter] duration-300 hover:drop-shadow-[0_0_18px_rgb(34_211_238/0.35)]"
      innerClassName="flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden">
        {member.photo_url ? (
          <SmartImage
            src={member.photo_url}
            alt={`Photo of ${member.name}`}
            sizes={s.image}
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <GenerativeArt seed={member.name} className="transition-transform duration-500 group-hover:scale-105" />
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center text-chrome font-display font-black tracking-widest drop-shadow-[0_2px_20px_rgb(0_0_0/0.6)]",
                size === "sm" ? "text-3xl" : "text-5xl",
              )}
              aria-hidden
            >
              {initials(member.name)}
            </span>
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface to-transparent" aria-hidden />
      </div>
      <div className={cn("flex flex-1 flex-col text-center", s.pad)}>
        <h4 className={cn("font-display font-bold tracking-[0.06em] text-ink uppercase", s.name)}>{member.name}</h4>
        <p
          className={cn(
            "mt-1.5 font-display font-semibold tracking-[0.2em] text-gold uppercase",
            size === "sm" ? "text-[0.55rem]" : "text-[0.56rem] tracking-[0.14em] sm:text-[0.62rem] sm:tracking-[0.2em]",
          )}
        >
          {member.designation}
        </p>
        {member.bio && size !== "sm" ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{member.bio}</p>
        ) : null}
        <div className={cn("mt-auto", size === "sm" ? "pt-3" : "pt-5")}>
          <SocialLinks member={member} small={size === "sm"} />
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
