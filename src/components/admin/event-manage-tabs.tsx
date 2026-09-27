"use client";

import { useState } from "react";
import type { ClubEvent } from "@/lib/types";
import { Tabs } from "@/components/ui/tabs";
import { EventAttendees } from "./event-attendees";
import { EventSubmissions } from "./event-submissions";

export function EventManageTabs({ event }: { event: ClubEvent }) {
  const [tab, setTab] = useState<"attendees" | "submissions">("attendees");
  return (
    <div>
      <Tabs
        idPrefix="manage"
        label="Event management"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "attendees", label: "Attendees & check-in" },
          { id: "submissions", label: "Submissions" },
        ]}
        className="mb-6"
      />
      <div role="tabpanel" id="manage-panel-attendees" aria-labelledby="manage-tab-attendees" hidden={tab !== "attendees"}>
        <EventAttendees event={event} />
      </div>
      <div role="tabpanel" id="manage-panel-submissions" aria-labelledby="manage-tab-submissions" hidden={tab !== "submissions"}>
        {tab === "submissions" ? <EventSubmissions eventId={event.id} /> : null}
      </div>
    </div>
  );
}
