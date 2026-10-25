import type { TeamMember } from "@/lib/types";
import { initials } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { GenerativeArt } from "@/components/ui/generative-art";
import { NamedIcon } from "@/components/ui/icon";
import { SmartImage } from "@/components/ui/smart-image";
import { SocialLinks } from "./team-cards";

export type Pod = { id: string; name: string; icon: string; description?: string; lead?: TeamMember; members: TeamMember[] };

function MiniMember({ member }: { member: TeamMember }) {
  return (
    <li className="group text-center">
      <div className="relative aspect-square overflow-hidden bg-surface-2 [--chamfer:14px] chamfer">
        {member.photo_url ? (
          <SmartImage
            src={member.photo_url}
            alt={`Photo of ${member.name}`}
            sizes="(min-width: 1280px) 110px, (min-width: 640px) 20vw, 30vw"
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <GenerativeArt seed={member.name} />
            <span
              className="absolute inset-0 flex items-center justify-center text-chrome font-display text-2xl font-black"
              aria-hidden
            >
              {initials(member.name)}
            </span>
          </>
        )}
      </div>
      <p className="mt-2 font-display text-[0.68rem] font-bold tracking-[0.06em] text-ink uppercase">{member.name}</p>
      {member.designation && !/^core( member)?$/i.test(member.designation) ? (
        <p className="mt-0.5 text-[0.62rem] text-gold">{member.designation}</p>
      ) : null}
      <div className="mt-2">
        <SocialLinks member={member} small />
      </div>
    </li>
  );
}

/** One pod: what it does, who leads it, and its core members. */
export function PodPanel({ pod }: { pod: Pod }) {
  const count = pod.members.length + (pod.lead ? 1 : 0);
  return (
    <ChamferFrame size={26} className="h-full" innerClassName="flex h-full flex-col bg-surface/95 p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <NamedIcon name={pod.icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h4 className="font-display text-xl font-extrabold tracking-[0.1em] text-ink uppercase">{pod.name}</h4>
            {count ? (
              <span className="font-mono text-[0.68rem] tracking-[0.16em] text-faint uppercase">
                {count} {count === 1 ? "member" : "members"}
              </span>
            ) : null}
          </div>
          {pod.description ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{pod.description}</p> : null}
        </div>
      </div>

      {pod.lead ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-2.5">
          <Avatar name={pod.lead.name} src={pod.lead.photo_url} size={36} />
          <p className="min-w-0 text-sm">
            <span className="block font-display text-[0.6rem] font-semibold tracking-[0.22em] text-gold uppercase">Pod lead</span>
            <span className="font-semibold text-ink">{pod.lead.name}</span>
            <span className="text-muted"> · {pod.lead.designation}</span>
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex-1">
        {pod.members.length ? (
          <ul
            aria-label={`${pod.name} core members`}
            className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5"
          >
            {pod.members.map((m) => (
              <MiniMember key={m.id} member={m} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-faint">
            Core members will be announced soon.
          </p>
        )}
      </div>
    </ChamferFrame>
  );
}
