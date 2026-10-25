import { ShieldAlert } from "lucide-react";
import { siteConfig } from "@/config/site";

/** The ground rules shown on every Play page. */
export function PlayRules() {
  return (
    <div className="rounded-3xl border border-danger/25 bg-danger/[0.05] p-5 text-sm leading-relaxed text-muted sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.2em] text-ink uppercase">
        <ShieldAlert className="size-4 text-danger" aria-hidden /> Hack ethically
      </h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li>
          Every challenge is a simulation. Everything you need is visible to any visitor: no attacking the servers, the database
          or other people&apos;s accounts.
        </li>
        <li>Flags look like ISSA&#123;...&#125;. Guessing is rate-limited, so think instead of brute-forcing.</li>
        <li>Don&apos;t share flags; share hints and techniques instead.</li>
        <li>
          Found a real bug? Report it privately to{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-primary hover:underline">
            {siteConfig.email}
          </a>{" "}
          and we&apos;ll credit you.
        </li>
      </ul>
    </div>
  );
}
