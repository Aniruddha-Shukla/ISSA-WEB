"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, FolderGit2 } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn, isSafeHttpUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { GenerativeArt } from "@/components/ui/generative-art";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { SmartImage } from "@/components/ui/smart-image";

type StatusFilter = "all" | ProjectStatus;

const INITIAL_VISIBLE = 4;

function ProjectRow({ project, flip }: { project: Project; flip: boolean }) {
  const repo = isSafeHttpUrl(project.repo_url) ? project.repo_url : null;
  const demo = isSafeHttpUrl(project.demo_url) ? project.demo_url : null;
  const primary = demo ?? repo;

  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      {/* chamfered artwork with a neon edge */}
      <div className={cn("group relative", flip && "md:order-2")}>
        <div
          className="absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,rgb(232_121_249/0.16),transparent)]"
          aria-hidden
        />
        <div className="bg-gradient-to-br from-primary/80 via-white/10 to-accent/80 p-[1.5px] [--chamfer:34px] chamfer">
          <div className="relative aspect-[16/10] overflow-hidden bg-surface-2 [--chamfer:33.4px] chamfer">
            {project.cover_url ? (
              <SmartImage
                src={project.cover_url}
                alt=""
                sizes="(min-width: 768px) 45vw, 100vw"
                className="transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <GenerativeArt seed={project.title} className="transition-transform duration-700 group-hover:scale-105" />
            )}
          </div>
        </div>
      </div>

      <div className={cn(flip && "md:order-1 md:text-right")}>
        <div className={cn("flex flex-wrap gap-2", flip && "md:justify-end")}>
          <Badge tone={project.status === "ongoing" ? "primary" : "accent"} dot pulse={project.status === "ongoing"}>
            {project.status}
          </Badge>
          {project.is_featured ? <Badge tone="warning">Featured</Badge> : null}
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold tracking-[0.06em] text-ink uppercase sm:text-3xl">{project.title}</h3>
        <p className="mt-4 leading-relaxed text-muted">{project.summary}</p>
        <ul className={cn("mt-5 flex flex-wrap gap-1.5", flip && "md:justify-end")} aria-label="Topics">
          {project.tags.map((t) => (
            <li key={t} className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[0.7rem] text-faint">
              #{t.toLowerCase().replace(/\W+/g, "")}
            </li>
          ))}
        </ul>
        {project.contributors.length ? (
          <p className="mt-4 text-sm text-faint">
            <span className="sr-only">Contributors: </span>
            {project.contributors.join(" · ")}
          </p>
        ) : null}
        {primary ? (
          <div className={cn("mt-7 flex flex-wrap items-center gap-3", flip && "md:justify-end")}>
            <a
              href={primary}
              target={primary.startsWith("/") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full px-6 font-display text-[0.7rem] font-semibold tracking-[0.18em] text-ink uppercase btn-neon"
            >
              Know more <ArrowRight className="size-4" aria-hidden />
              <span className="sr-only"> about {project.title}</span>
            </a>
            {demo && repo ? (
              <a
                href={repo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong text-muted transition-colors hover:border-primary/50 hover:text-primary"
                aria-label={`${project.title} source code on GitHub`}
              >
                <GithubIcon size={17} />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectsSection({ projects }: { projects: Project[] }) {
  const [tag, setTag] = useState<string>("All");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return ["All", ...[...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)];
  }, [projects]);

  const filtered = projects.filter((p) => (tag === "All" || p.tags.includes(tag)) && (status === "all" || p.status === status));
  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);

  return (
    <section id="projects" aria-labelledby="projects-title" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="projects-title"
          kicker="03 · What we're building"
          title="Projects"
          description="Open-source tools and research built by club members. Every project welcomes new contributors."
        />

        <div className="mb-14 flex flex-col items-center gap-4">
          <div role="group" aria-label="Filter projects by topic" className="flex flex-wrap justify-center gap-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(t)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  tag === t
                    ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_16px_-6px_rgb(34_211_238/0.8)]"
                    : "border-line text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div
            role="group"
            aria-label="Filter projects by status"
            className="inline-flex rounded-full border border-line-strong bg-black/60 p-1"
          >
            {(["all", "ongoing", "completed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full px-4 py-1 font-display text-[0.65rem] font-semibold tracking-[0.16em] uppercase transition-colors",
                  status === s ? "bg-surface-3 text-ink ring-1 ring-primary/40" : "text-muted hover:text-ink",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Showing {visible.length} of {projects.length} projects
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 className="size-5" />}
            title="No projects match these filters"
            description="Try another topic or status."
          />
        ) : (
          <ul className="space-y-20 sm:space-y-24">
            <AnimatePresence initial={false}>
              {visible.map((project, i) => (
                <motion.li
                  key={project.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ProjectRow project={project} flip={i % 2 === 1} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        {filtered.length > INITIAL_VISIBLE ? (
          <div className="mt-16 flex justify-center">
            <Button variant="outline" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? "Show fewer" : `Show all ${filtered.length} projects`}
              <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
            </Button>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
