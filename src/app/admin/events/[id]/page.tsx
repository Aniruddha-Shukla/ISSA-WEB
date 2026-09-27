import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ScanQrCode } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClubEvent } from "@/lib/types";
import { formatEventWhen } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EventManageTabs } from "@/components/admin/event-manage-tabs";

export const metadata: Metadata = { title: "Manage event" };

export default async function ManageEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  // RLS lets admins read drafts too; everyone else gets nothing.
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  const event = data as ClubEvent | null;
  if (!event) notFound();

  return (
    <>
      <Link href="/admin/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Events
      </Link>
      <AdminPageHeader
        title={event.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatEventWhen(event.starts_at, event.ends_at)}
            {!event.is_published ? <Badge tone="warning">draft</Badge> : null}
          </span>
        }
        actions={
          <>
            <Link href="/admin/check-in" className={buttonClasses({ size: "sm" })}>
              <ScanQrCode className="size-4" aria-hidden /> Open scanner
            </Link>
            <Link href={`/events/${event.slug}`} target="_blank" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <ExternalLink className="size-4" aria-hidden /> Public page
            </Link>
          </>
        }
      />
      <EventManageTabs event={event} />
    </>
  );
}
