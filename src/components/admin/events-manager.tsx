"use client";

import Link from "next/link";
import { ExternalLink, Users } from "lucide-react";
import type { ClubEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { CategoryBadge } from "@/components/events/event-bits";
import { ResourceManager, type ResourceConfig } from "./resource-manager";

const categoryOptions = ["workshop", "hackathon", "ctf", "talk", "competition", "meetup", "other"].map((v) => ({
  value: v,
  label: v === "ctf" ? "CTF" : v[0].toUpperCase() + v.slice(1),
}));

const eventsConfig: ResourceConfig<ClubEvent> = {
  table: "events",
  singular: "Event",
  order: [{ column: "starts_at", ascending: false }],
  search: (e) => `${e.title} ${e.slug} ${e.category} ${e.location ?? ""}`,
  publishField: "is_published",
  defaults: { category: "workshop", mode: "offline", registration_open: true, is_published: false },
  fields: [
    { name: "title", label: "Title", type: "text", required: true, wide: true },
    {
      name: "slug",
      label: "URL slug",
      type: "slug",
      from: "title",
      hint: "Lowercase words separated by hyphens. Leave blank to generate.",
    },
    { name: "category", label: "Category", type: "select", required: true, options: categoryOptions },
    { name: "summary", label: "One-line summary", type: "text", required: true, wide: true },
    { name: "description", label: "Description", type: "textarea", hint: "Markdown supported: **bold**, lists, links." },
    { name: "starts_at", label: "Starts", type: "datetime", required: true },
    { name: "ends_at", label: "Ends", type: "datetime" },
    {
      name: "mode",
      label: "Mode",
      type: "select",
      required: true,
      options: [
        { value: "offline", label: "Offline" },
        { value: "online", label: "Online" },
        { value: "hybrid", label: "Hybrid" },
      ],
    },
    { name: "location", label: "Location / link", type: "text", placeholder: "Lab 3, CSE Block" },
    { name: "capacity", label: "Capacity", type: "number", hint: "Leave blank for unlimited seats." },
    { name: "registration_deadline", label: "Registration deadline", type: "datetime", hint: "Defaults to the start time." },
    { name: "registration_open", label: "Registration open", type: "boolean" },
    { name: "members_only", label: "Members only", type: "boolean", hint: "Guests can't register." },
    {
      name: "submissions_open",
      label: "Accept submissions",
      type: "boolean",
      hint: "Shows the submission portal on the event page.",
    },
    { name: "submission_deadline", label: "Submission deadline", type: "datetime" },
    { name: "submission_guidelines", label: "Submission guidelines", type: "textarea" },
    { name: "cover_url", label: "Cover image", type: "image", hint: "Optional — a generated artwork is used otherwise." },
    { name: "tags", label: "Tags", type: "tags", placeholder: "web, beginner-friendly" },
    { name: "is_featured", label: "Featured", type: "boolean" },
    { name: "is_published", label: "Published", type: "boolean", hint: "Drafts are only visible to admins." },
  ],
  columns: [
    {
      header: "Event",
      cell: (e) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{e.title}</p>
          <p className="font-mono text-xs text-faint">/{e.slug}</p>
        </div>
      ),
    },
    { header: "Type", cell: (e) => <CategoryBadge category={e.category} /> },
    { header: "Starts", cell: (e) => <span className="whitespace-nowrap text-muted">{formatDateTime(e.starts_at)}</span> },
    {
      header: "Flags",
      cell: (e) => (
        <div className="flex flex-wrap gap-1">
          {e.members_only ? <Badge tone="accent">members</Badge> : null}
          {e.submissions_open ? <Badge tone="cyan">submissions</Badge> : null}
          {!e.registration_open ? <Badge>closed</Badge> : null}
        </div>
      ),
    },
  ],
  rowActions: (e) => (
    <>
      <Link href={`/admin/events/${e.id}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
        <Users className="size-4" aria-hidden /> Manage
      </Link>
      <Link
        href={`/events/${e.slug}`}
        target="_blank"
        className={buttonClasses({ variant: "ghost", size: "icon-sm" })}
        aria-label={`View ${e.title} on the site`}
      >
        <ExternalLink className="size-4" />
      </Link>
    </>
  ),
};

export function EventsManager() {
  return <ResourceManager config={eventsConfig} />;
}
