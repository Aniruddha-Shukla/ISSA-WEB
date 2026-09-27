"use client";

import { useState } from "react";
import type { Achievement, GalleryItem, Project, TeamMember } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ResourceManager, type ResourceConfig } from "./resource-manager";

const teamConfig: ResourceConfig<TeamMember> = {
  table: "team_members",
  singular: "Team member",
  order: [{ column: "sort_order" }, { column: "name" }],
  search: (m) => `${m.name} ${m.designation}`,
  publishField: "is_published",
  defaults: { is_published: true, sort_order: 10 },
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "designation", label: "Designation", type: "text", required: true, placeholder: "President" },
    { name: "photo_url", label: "Photo", type: "image", hint: "Square photos look best. Initials are shown if empty." },
    { name: "bio", label: "Short bio", type: "textarea" },
    { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
    { name: "github_url", label: "GitHub URL", type: "url" },
    { name: "twitter_url", label: "X / Twitter URL", type: "url" },
    { name: "instagram_url", label: "Instagram URL", type: "url" },
    { name: "email", label: "Public email", type: "text" },
    { name: "tenure", label: "Tenure", type: "text", placeholder: "2026–27" },
    { name: "sort_order", label: "Display order", type: "number", hint: "Lower numbers appear first." },
    { name: "is_published", label: "Show on website", type: "boolean" },
  ],
  columns: [
    {
      header: "Member",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} src={m.photo_url} size={32} />
          <div>
            <p className="font-medium text-ink">{m.name}</p>
            <p className="text-xs text-faint">{m.designation}</p>
          </div>
        </div>
      ),
    },
    { header: "Tenure", cell: (m) => <span className="text-muted">{m.tenure ?? "—"}</span> },
    { header: "Order", cell: (m) => <span className="font-mono text-muted">{m.sort_order}</span> },
  ],
};

const projectConfig: ResourceConfig<Project> = {
  table: "projects",
  singular: "Project",
  order: [{ column: "sort_order" }, { column: "title" }],
  search: (p) => `${p.title} ${p.tags.join(" ")} ${p.contributors.join(" ")}`,
  publishField: "is_published",
  defaults: { status: "ongoing", is_published: true, sort_order: 10 },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "ongoing", label: "Ongoing" },
        { value: "completed", label: "Completed" },
      ],
    },
    { name: "summary", label: "Summary", type: "text", required: true, wide: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "tags", label: "Filter tags", type: "tags", placeholder: "Security, Web, AI/ML" },
    { name: "contributors", label: "Contributors", type: "tags", placeholder: "Name One, Name Two" },
    { name: "repo_url", label: "GitHub repository", type: "url" },
    { name: "demo_url", label: "Live demo", type: "url" },
    { name: "cover_url", label: "Cover image", type: "image" },
    { name: "sort_order", label: "Display order", type: "number" },
    { name: "is_featured", label: "Featured", type: "boolean" },
    { name: "is_published", label: "Show on website", type: "boolean" },
  ],
  columns: [
    {
      header: "Project",
      cell: (p) => (
        <div>
          <p className="font-medium text-ink">{p.title}</p>
          <p className="line-clamp-1 max-w-md text-xs text-faint">{p.summary}</p>
        </div>
      ),
    },
    { header: "Status", cell: (p) => <Badge tone={p.status === "ongoing" ? "primary" : "accent"}>{p.status}</Badge> },
    { header: "Tags", cell: (p) => <span className="text-xs text-muted">{p.tags.join(", ")}</span> },
  ],
};

const achievementConfig: ResourceConfig<Achievement> = {
  table: "achievements",
  singular: "Achievement",
  order: [{ column: "achieved_on", ascending: false }],
  search: (a) => `${a.title} ${a.recipients} ${a.category}`,
  publishField: "is_published",
  defaults: { category: "hackathon", is_published: true },
  fields: [
    { name: "title", label: "Title", type: "text", required: true, wide: true },
    {
      name: "recipients",
      label: "Recipients",
      type: "text",
      required: true,
      wide: true,
      placeholder: "Team Null Pointers · A, B, C",
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: ["hackathon", "ctf", "certification", "award", "publication", "other"].map((v) => ({
        value: v,
        label: v === "ctf" ? "CTF" : v[0].toUpperCase() + v.slice(1),
      })),
    },
    { name: "position", label: "Position / result", type: "text", placeholder: "Winner, 1st Runner-up, Top 50…" },
    { name: "achieved_on", label: "Date", type: "date" },
    { name: "link_url", label: "Link", type: "url" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "image_url", label: "Image", type: "image" },
    { name: "is_featured", label: "Featured (large card)", type: "boolean" },
    { name: "is_published", label: "Show on website", type: "boolean" },
  ],
  columns: [
    {
      header: "Achievement",
      cell: (a) => (
        <div>
          <p className="font-medium text-ink">{a.title}</p>
          <p className="text-xs text-faint">{a.recipients}</p>
        </div>
      ),
    },
    { header: "Category", cell: (a) => <Badge tone="warning">{a.category}</Badge> },
    {
      header: "Date",
      cell: (a) => <span className="whitespace-nowrap text-muted">{a.achieved_on ? formatDate(a.achieved_on) : "—"}</span>,
    },
  ],
};

const galleryConfig: ResourceConfig<GalleryItem> = {
  table: "gallery_items",
  singular: "Gallery item",
  order: [{ column: "sort_order" }, { column: "taken_on", ascending: false }],
  search: (g) => `${g.title} ${g.caption ?? ""}`,
  publishField: "is_published",
  defaults: { media_type: "image", is_published: true, sort_order: 10 },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "media_type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "image", label: "Photo" },
        { value: "video", label: "Video (YouTube / .mp4)" },
      ],
    },
    { name: "url", label: "Photo or video URL", type: "image", hint: "Upload a photo, or paste a YouTube link for videos." },
    { name: "thumbnail_url", label: "Custom thumbnail", type: "image", hint: "Optional. YouTube thumbnails are automatic." },
    { name: "caption", label: "Caption", type: "text", wide: true },
    { name: "taken_on", label: "Date", type: "date" },
    { name: "sort_order", label: "Display order", type: "number" },
    { name: "is_published", label: "Show on website", type: "boolean" },
  ],
  columns: [
    {
      header: "Item",
      cell: (g) => (
        <div>
          <p className="font-medium text-ink">{g.title}</p>
          <p className="line-clamp-1 max-w-md text-xs text-faint">{g.caption}</p>
        </div>
      ),
    },
    { header: "Type", cell: (g) => <Badge tone={g.media_type === "video" ? "cyan" : "neutral"}>{g.media_type}</Badge> },
    { header: "Order", cell: (g) => <span className="font-mono text-muted">{g.sort_order}</span> },
  ],
};

type Tab = "team" | "projects" | "achievements" | "gallery";

export function ContentAdmin() {
  const [tab, setTab] = useState<Tab>("team");
  return (
    <div>
      <Tabs
        idPrefix="content"
        label="Content type"
        value={tab}
        onChange={setTab}
        className="mb-6"
        tabs={[
          { id: "team", label: "Office bearers" },
          { id: "projects", label: "Projects" },
          { id: "achievements", label: "Hall of Fame" },
          { id: "gallery", label: "Gallery" },
        ]}
      />
      <div role="tabpanel" id={`content-panel-${tab}`} aria-labelledby={`content-tab-${tab}`}>
        {tab === "team" ? <ResourceManager config={teamConfig} /> : null}
        {tab === "projects" ? <ResourceManager config={projectConfig} /> : null}
        {tab === "achievements" ? <ResourceManager config={achievementConfig} /> : null}
        {tab === "gallery" ? <ResourceManager config={galleryConfig} /> : null}
      </div>
    </div>
  );
}
