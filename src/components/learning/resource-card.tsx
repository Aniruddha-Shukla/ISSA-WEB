import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Map as MapIcon,
  MonitorPlay,
  Newspaper,
  NotebookText,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { LearningKind, LearningLevel, LearningResource } from "@/lib/types";
import { cn, isSafeHttpUrl } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/badge";

export const kindMeta: Record<LearningKind, { label: string; icon: LucideIcon }> = {
  course: { label: "Course", icon: GraduationCap },
  platform: { label: "Practice platform", icon: Target },
  video: { label: "Video", icon: MonitorPlay },
  article: { label: "Article", icon: Newspaper },
  tool: { label: "Tool", icon: Wrench },
  book: { label: "Book", icon: BookOpen },
  roadmap: { label: "Roadmap", icon: MapIcon },
  notes: { label: "Notes & docs", icon: NotebookText },
};

export const levelTone: Record<LearningLevel, BadgeTone> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

export function ResourceCard({ resource, className }: { resource: LearningResource; className?: string }) {
  const { icon: Icon, label } = kindMeta[resource.kind] ?? kindMeta.course;
  const href = isSafeHttpUrl(resource.url) ? resource.url : undefined;
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl card-hover glass p-5 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-primary",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge tone={levelTone[resource.level]}>{resource.level}</Badge>
          <Badge tone={resource.is_free ? "cyan" : "neutral"}>{resource.is_free ? "free" : "free + paid"}</Badge>
        </div>
      </div>
      <p className="mt-4 font-mono text-[0.68rem] tracking-[0.16em] text-faint uppercase">
        {label}
        {resource.source ? ` · ${resource.source}` : ""}
      </p>
      <h3 className="mt-1.5 font-display text-[0.95rem] font-bold tracking-[0.04em] text-ink uppercase">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {resource.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </h3>
      {resource.description ? <p className="mt-2 text-sm leading-relaxed text-muted">{resource.description}</p> : null}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        {resource.tags.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {resource.tags.map((tag) => (
              <li key={tag} className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[0.7rem] text-faint">
                #{tag}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <ArrowUpRight
          className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          aria-hidden
        />
      </div>
    </article>
  );
}
