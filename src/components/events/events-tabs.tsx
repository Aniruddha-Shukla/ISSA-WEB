"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

/** Client-side tab switcher; the panels themselves are server-rendered and passed in. */
export function EventsTabs({
  upcoming,
  past,
  upcomingCount,
  pastCount,
  idPrefix = "events",
  centered = false,
}: {
  upcoming: ReactNode;
  past: ReactNode;
  upcomingCount: number;
  pastCount: number;
  idPrefix?: string;
  centered?: boolean;
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  return (
    <div className={centered ? "flex flex-col items-center [&>[role=tabpanel]]:w-full" : undefined}>
      <Tabs
        idPrefix={idPrefix}
        label="Event timeline"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "upcoming", label: "Upcoming", count: upcomingCount },
          { id: "past", label: "Past", count: pastCount },
        ]}
        className="mb-8"
      />
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-upcoming`}
        aria-labelledby={`${idPrefix}-tab-upcoming`}
        hidden={tab !== "upcoming"}
      >
        {upcoming}
      </div>
      <div role="tabpanel" id={`${idPrefix}-panel-past`} aria-labelledby={`${idPrefix}-tab-past`} hidden={tab !== "past"}>
        {past}
      </div>
    </div>
  );
}
