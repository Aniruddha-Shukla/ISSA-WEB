"use client";

import { useState } from "react";
import { teamDomains } from "@/config/site";
import type { CtfChallenge, GalleryItem, LearningResource, Project, RegistrationLink, TeamMember, TeamTier } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, formatDateTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ResourceManager, type ResourceConfig } from "./resource-manager";

const tierLabel: Record<TeamTier, string> = { office_bearer: "Office bearer", lead: "Lead", core: "Core member" };

const teamConfig: ResourceConfig<TeamMember> = {
  table: "team_members",
  singular: "Team member",
  // "office_bearer" > "lead" > "core", so descending tier order lists office bearers first.
  order: [{ column: "tier", ascending: false }, { column: "domain" }, { column: "sort_order" }, { column: "name" }],
  search: (m) => `${m.name} ${m.designation} ${m.domain ?? ""}`,
  publishField: "is_published",
  defaults: { is_published: true, sort_order: 10, tier: "core" },
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "tier",
      label: "Level",
      type: "select",
      required: true,
      options: (Object.keys(tierLabel) as TeamTier[]).map((value) => ({ value, label: tierLabel[value] })),
      hint: "Office bearers and pod leads share the top group (office bearers first); core members are shown in their pod.",
    },
    {
      name: "domain",
      label: "Pod",
      type: "select",
      options: teamDomains.map((d) => ({ value: d, label: d })),
      hint: "The pod a lead or core member belongs to. Leave empty for office bearers.",
    },
    {
      name: "designation",
      label: "Designation",
      type: "text",
      required: true,
      placeholder: "President · Tech Lead · Core Member",
    },
    { name: "photo_url", label: "Photo", type: "image", hint: "Square photos look best. Initials are shown if empty." },
    { name: "bio", label: "Short bio", type: "textarea" },
    { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
    { name: "github_url", label: "GitHub URL", type: "url" },
    { name: "twitter_url", label: "X / Twitter URL", type: "url" },
    { name: "instagram_url", label: "Instagram URL", type: "url" },
    { name: "email", label: "Public email", type: "text" },
    { name: "tenure", label: "Tenure", type: "text", placeholder: "2026–27" },
    { name: "sort_order", label: "Display order", type: "number", emptyValue: 0, hint: "Lower numbers appear first." },
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
    {
      header: "Level",
      cell: (m) => (
        <span className="text-muted">
          {tierLabel[m.tier] ?? m.tier}
          {m.domain ? <span className="text-faint"> · {m.domain}</span> : null}
        </span>
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
    { name: "sort_order", label: "Display order", type: "number", emptyValue: 0 },
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

const registrationConfig: ResourceConfig<RegistrationLink> = {
  table: "registration_links",
  singular: "Registration",
  order: [{ column: "sort_order" }, { column: "created_at", ascending: false }],
  search: (r) => `${r.title} ${r.description ?? ""}`,
  publishField: "is_published",
  defaults: { is_published: true, sort_order: 10 },
  fields: [
    { name: "title", label: "Title", type: "text", required: true, placeholder: "Hack Night: Web Exploitation 101" },
    { name: "description", label: "Short description", type: "textarea", wide: true },
    {
      name: "form_url",
      label: "Registration form link",
      type: "url",
      required: true,
      wide: true,
      placeholder: "https://forms.gle/…",
      hint: "Paste the Google Form's share link. A QR code for it is generated automatically.",
    },
    {
      name: "qr_image_url",
      label: "Custom QR / poster image",
      type: "image",
      hint: "Optional. Leave empty to use the generated QR code.",
    },
    { name: "closes_at", label: "Closes at", type: "datetime", hint: "Optional. It disappears from the site after this time." },
    { name: "sort_order", label: "Display order", type: "number", emptyValue: 0, hint: "Lower numbers appear first." },
    { name: "is_published", label: "Show on website", type: "boolean" },
  ],
  columns: [
    {
      header: "Registration",
      cell: (r) => (
        <div>
          <p className="font-medium text-ink">{r.title}</p>
          <p className="line-clamp-1 max-w-md font-mono text-xs text-faint">{r.form_url}</p>
        </div>
      ),
    },
    {
      header: "Closes",
      cell: (r) => <span className="text-muted">{r.closes_at ? formatDateTime(r.closes_at) : "—"}</span>,
    },
    { header: "Order", cell: (r) => <span className="font-mono text-muted">{r.sort_order}</span> },
  ],
};

const challengeConfig: ResourceConfig<CtfChallenge> = {
  table: "ctf_challenges",
  singular: "Challenge",
  order: [{ column: "kind" }, { column: "sort_order" }],
  search: (c) => `${c.title} ${c.slug} ${c.category}`,
  publishField: "is_published",
  defaults: { kind: "arena", category: "misc", difficulty: "easy", points: 100, is_published: true, sort_order: 10 },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "slug", label: "Slug", type: "slug", from: "title", hint: "Leave empty to generate it from the title." },
    {
      name: "kind",
      label: "Where it lives",
      type: "select",
      required: true,
      options: [
        { value: "arena", label: "CTF arena" },
        { value: "hunt", label: "Website flag hunt" },
      ],
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: [
        { value: "web", label: "Web" },
        { value: "crypto", label: "Crypto" },
        { value: "forensics", label: "Forensics" },
        { value: "osint", label: "OSINT" },
        { value: "misc", label: "Misc" },
      ],
    },
    {
      name: "difficulty",
      label: "Difficulty",
      type: "select",
      required: true,
      options: [
        { value: "easy", label: "Easy" },
        { value: "medium", label: "Medium" },
        { value: "hard", label: "Hard" },
      ],
    },
    { name: "points", label: "Points", type: "number", required: true, emptyValue: 100 },
    {
      name: "description",
      label: "Challenge text",
      type: "textarea",
      wide: true,
      hint: "Markdown: **bold**, `code`, ``` code blocks ```, [links](https://…).",
    },
    { name: "hint", label: "Hint", type: "textarea", wide: true, hint: "Optional. Players reveal it with a click." },
    { name: "attachment_url", label: "Attachment link", type: "url", hint: "Optional file players download (image, zip…)." },
    {
      name: "flag",
      label: "Flag",
      type: "text",
      virtual: true,
      placeholder: "ISSA{…}",
      hint: "Saved only as a one-way hash, so it can't be shown again. Leave empty to keep the current flag.",
    },
    { name: "sort_order", label: "Display order", type: "number", emptyValue: 0 },
    { name: "is_published", label: "Show on website", type: "boolean" },
  ],
  afterSave: async (id, virtual, created) => {
    if (!virtual.flag) return created ? "No flag set yet. Players can't solve it until you add one." : null;
    const { error } = await getSupabaseBrowserClient().rpc("set_ctf_flag", { p_challenge_id: id, p_flag: virtual.flag });
    return error ? `The flag wasn't saved: ${errorMessage(error)}` : null;
  },
  columns: [
    {
      header: "Challenge",
      cell: (c) => (
        <div>
          <p className="font-medium text-ink">{c.title}</p>
          <p className="font-mono text-xs text-faint">{c.slug}</p>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (c) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={c.kind === "hunt" ? "warning" : "primary"}>{c.kind === "hunt" ? "flag hunt" : "arena"}</Badge>
          <Badge tone="neutral">{c.category}</Badge>
        </div>
      ),
    },
    { header: "Points", cell: (c) => <span className="font-mono text-muted">{c.points}</span> },
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
    { name: "sort_order", label: "Display order", type: "number", emptyValue: 0 },
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

const learningConfig: ResourceConfig<LearningResource> = {
  table: "learning_resources",
  singular: "Resource",
  order: [{ column: "track" }, { column: "sort_order" }, { column: "title" }],
  search: (r) => `${r.title} ${r.track} ${r.source ?? ""} ${r.tags.join(" ")}`,
  publishField: "is_published",
  defaults: { track: "Getting Started", kind: "course", level: "beginner", is_free: true, is_published: true, sort_order: 10 },
  fields: [
    { name: "title", label: "Title", type: "text", required: true, wide: true },
    { name: "url", label: "Link", type: "url", required: true, wide: true, placeholder: "https://…" },
    {
      name: "track",
      label: "Track",
      type: "text",
      required: true,
      hint: "Groups resources on the Learn page, e.g. Getting Started, Web Security, Linux & Networking, CTF Practice.",
    },
    { name: "source", label: "Source / author", type: "text", placeholder: "PortSwigger, ISSA Workshop…" },
    {
      name: "kind",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "course", label: "Course" },
        { value: "platform", label: "Practice platform / labs" },
        { value: "video", label: "Video" },
        { value: "article", label: "Article" },
        { value: "tool", label: "Tool" },
        { value: "book", label: "Book" },
        { value: "roadmap", label: "Roadmap" },
        { value: "notes", label: "Notes & docs (e.g. workshop slides)" },
      ],
    },
    {
      name: "level",
      label: "Level",
      type: "select",
      required: true,
      options: [
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
      ],
    },
    { name: "description", label: "Why it's worth it", type: "textarea", hint: "One or two sentences." },
    { name: "tags", label: "Tags", type: "tags", placeholder: "web, labs, ctf" },
    { name: "sort_order", label: "Order within track", type: "number", emptyValue: 0, hint: "Lower numbers appear first." },
    { name: "is_free", label: "Free to use", type: "boolean" },
    { name: "is_featured", label: "Featured on the home page", type: "boolean" },
    { name: "is_published", label: "Show on website", type: "boolean" },
  ],
  columns: [
    {
      header: "Resource",
      cell: (r) => (
        <div>
          <p className="font-medium text-ink">{r.title}</p>
          <p className="line-clamp-1 max-w-md text-xs text-faint">{r.source ?? r.url}</p>
        </div>
      ),
    },
    { header: "Track", cell: (r) => <span className="text-muted">{r.track}</span> },
    {
      header: "Level",
      cell: (r) => (
        <Badge tone={r.level === "beginner" ? "success" : r.level === "intermediate" ? "warning" : "danger"}>{r.level}</Badge>
      ),
    },
  ],
};

type Tab = "team" | "projects" | "registrations" | "challenges" | "gallery" | "learning";

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
          { id: "team", label: "Team" },
          { id: "projects", label: "Projects" },
          { id: "registrations", label: "Registrations" },
          { id: "challenges", label: "Play challenges" },
          { id: "gallery", label: "Gallery" },
          { id: "learning", label: "Learning hub" },
        ]}
      />
      <div role="tabpanel" id={`content-panel-${tab}`} aria-labelledby={`content-tab-${tab}`}>
        {tab === "team" ? <ResourceManager config={teamConfig} /> : null}
        {tab === "projects" ? <ResourceManager config={projectConfig} /> : null}
        {tab === "registrations" ? <ResourceManager config={registrationConfig} /> : null}
        {tab === "challenges" ? <ResourceManager config={challengeConfig} /> : null}
        {tab === "gallery" ? <ResourceManager config={galleryConfig} /> : null}
        {tab === "learning" ? <ResourceManager config={learningConfig} /> : null}
      </div>
    </div>
  );
}
