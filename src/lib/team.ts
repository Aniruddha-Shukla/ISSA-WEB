import type { TeamMember, TeamTier } from "@/lib/types";

const tierRank: Record<TeamTier, number> = { office_bearer: 0, lead: 1, core: 2 };

/** Office bearers first, then leads, then core members (stable within each tier). */
export const byTier = (a: TeamMember, b: TeamMember) => tierRank[a.tier] - tierRank[b.tier];

/** "Riya Sen — Technical Lead (Technical)"; office bearers have no domain. */
export function describeMember(m: TeamMember) {
  const domain = m.domain && m.tier !== "office_bearer" && !m.designation.includes(m.domain) ? ` (${m.domain})` : "";
  return `${m.name} — ${m.designation}${domain}`;
}
