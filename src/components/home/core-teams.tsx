"use client";

import { useState } from "react";
import type { TeamMember } from "@/lib/types";
import { Tabs } from "@/components/ui/tabs";
import { MemberCard } from "./team-cards";

export type DomainGroup = { id: string; domain: string; members: TeamMember[] };

/** Core members, one tab per domain (no tabs when there is only one group). */
export function CoreTeams({ groups }: { groups: DomainGroup[] }) {
  const [active, setActive] = useState(groups[0]?.id ?? "");
  const grid = (members: TeamMember[]) => (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {members.map((m) => (
        <li key={m.id}>
          <MemberCard member={m} size="sm" />
        </li>
      ))}
    </ul>
  );

  if (groups.length === 1) return grid(groups[0].members);

  return (
    <div className="flex flex-col items-center">
      <Tabs
        idPrefix="core-team"
        label="Core team by domain"
        value={active}
        onChange={setActive}
        tabs={groups.map((g) => ({ id: g.id, label: g.domain, count: g.members.length }))}
        className="mb-8 justify-center"
      />
      {groups.map((g) => (
        <div
          key={g.id}
          role="tabpanel"
          id={`core-team-panel-${g.id}`}
          aria-labelledby={`core-team-tab-${g.id}`}
          hidden={g.id !== active}
          className="w-full"
        >
          {grid(g.members)}
        </div>
      ))}
    </div>
  );
}
