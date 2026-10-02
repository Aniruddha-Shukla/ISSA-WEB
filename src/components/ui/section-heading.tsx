import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-display text-[0.7rem] font-semibold tracking-[0.32em] text-gold uppercase", className)}>{children}</p>
  );
}

/** Centered chrome title with a neon rule — the site-wide section header. */
export function SectionHeading({
  kicker,
  title,
  description,
  action,
  align = "center",
  as: Heading = "h2",
  id,
}: {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  id?: string;
}) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "mb-12 flex flex-col gap-6 md:mb-14",
        centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn("max-w-3xl", centered && "mx-auto")}>
        <Kicker>{kicker}</Kicker>
        <Heading
          id={id}
          className="mt-3 text-chrome font-display text-3xl leading-tight font-extrabold tracking-[0.08em] uppercase sm:text-5xl"
        >
          {title}
        </Heading>
        <span
          className={cn(
            "mt-5 block h-px w-40 bg-gradient-to-r from-transparent via-primary to-transparent",
            centered ? "mx-auto" : "from-primary via-accent/60",
          )}
          aria-hidden
        />
        {description ? <p className="mt-5 leading-relaxed text-base text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
