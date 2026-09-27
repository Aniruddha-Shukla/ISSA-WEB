import type { ReactNode } from "react";
import { CircleAlert, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <LoaderCircle className={cn("size-5 animate-spin text-primary", className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

const noticeTones = {
  info: { icon: Info, classes: "border-cyan/25 bg-cyan/[0.06] text-cyan" },
  warning: { icon: TriangleAlert, classes: "border-warning/25 bg-warning/[0.06] text-warning" },
  error: { icon: CircleAlert, classes: "border-danger/30 bg-danger/[0.06] text-danger" },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof noticeTones;
  title?: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const { icon: Icon, classes } = noticeTones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", classes, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium text-ink">{title}</p> : null}
        {children ? <div className={cn("text-muted", title && "mt-1")}>{children}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-4 rounded-xl border border-line bg-surface-2 p-3 text-primary">{icon}</div> : null}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)} aria-hidden />;
}
