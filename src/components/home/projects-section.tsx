"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, FolderGit2 } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn, isSafeHttpUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/ui/brand-icons";
import { EmptyState } from "@/components/ui/feedback";
import { GenerativeArt } from "@/components/ui/generative-art";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { SmartImage } from "@/components/ui/smart-image";

type StatusFilter = "all" | ProjectStatus;

export function ProjectsSection({ projects }: { projects: Project[] }) {
  const [tag, setTag] = useState<string>("All");
  const [status, setStatus] = useState<StatusFilter>("all");

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return ["All", ...[...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)];
  }, [projects]);

  const filtered = projects.filter((p) => (tag === "All" || p.tags.includes(tag)) && (status === "all" || p.status === status));

  return (
    <section id="projects" aria-labelledby="projects-title" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="projects-title"
          kicker="03 — Projects"
          title="What we're building"
          description="Open-source tools and research built by club members. Every project welcomes new contributors."
        />

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Filter projects by topic" className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(t)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  tag === t
                    ? "border-primary/50 bg-primary/10 text-primary"
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
            className="inline-flex rounded-xl border border-line bg-surface-2 p-1"
          >
            {(["all", "ongoing", "completed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-lg px-3 py-1 text-sm capitalize transition-colors",
                  status === s ? "bg-surface-3 text-ink ring-1 ring-line-strong" : "text-muted hover:text-ink",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Showing {filtered.length} of {projects.length} projects
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 className="size-5" />}
            title="No projects match these filters"
            description="Try another topic or status."
          />
        ) : (
          <motion.ul layout className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {filtered.map((project) => (
                <motion.li
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="group flex flex-col overflow-hidden card card-hover"
                >
                  <div className="relative aspect-[16/9] overflow-hidden border-b border-line">
                    {project.cover_url ? (
                      <SmartImage
                        src={project.cover_url}
                        alt=""
                        className="transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <GenerativeArt seed={project.title} className="transition-transform duration-500 group-hover:scale-105" />
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge
                        tone={project.status === "ongoing" ? "primary" : "accent"}
                        dot
                        pulse={project.status === "ongoing"}
                        className="backdrop-blur"
                      >
                        {project.status}
                      </Badge>
                      {project.is_featured ? (
                        <Badge tone="warning" className="backdrop-blur">
                          Featured
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-semibold text-ink">{project.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{project.summary}</p>
                    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Topics">
                      {project.tags.map((t) => (
                        <li key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[0.7rem] text-faint">
                          #{t.toLowerCase().replace(/\W+/g, "")}
                        </li>
                      ))}
                    </ul>
                    {project.contributors.length ? (
                      <p className="mt-4 text-xs text-faint">
                        <span className="sr-only">Contributors: </span>
                        {project.contributors.join(" · ")}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      {isSafeHttpUrl(project.repo_url) ? (
                        <a
                          href={project.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <GithubIcon size={15} /> Code<span className="sr-only"> for {project.title} on GitHub</span>
                        </a>
                      ) : null}
                      {isSafeHttpUrl(project.demo_url) ? (
                        <a
                          href={project.demo_url}
                          target={project.demo_url.startsWith("/") ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/20"
                        >
                          Live demo <ArrowUpRight className="size-3.5" aria-hidden />
                          <span className="sr-only"> of {project.title}</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </Container>
    </section>
  );
}
