import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-xs font-medium tracking-[0.22em] text-primary uppercase", className)}>
      <span className="text-faint" aria-hidden>
        {"// "}
      </span>
      {children}
    </p>
  );
}

export function SectionHeading({
  kicker,
  title,
  description,
  action,
  align = "left",
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
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-5 md:mb-12",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <Kicker>{kicker}</Kicker>
        <Heading id={id} className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </Heading>
        {description ? <p className="mt-4 leading-relaxed text-base text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
