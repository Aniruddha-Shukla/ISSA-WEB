import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EventsManager } from "@/components/admin/events-manager";

export const metadata: Metadata = { title: "Events" };

export default function AdminEventsPage() {
  return (
    <>
      <AdminPageHeader
        title="Events"
        description="Create and publish events, open registrations and submissions, then open “Manage” for attendees, check-ins and submissions."
      />
      <EventsManager />
    </>
  );
}
