-- =============================================================================
-- Club hierarchy for the Team section:
--   office bearers (President, Vice President, Treasurer…)
--   → one lead per domain → the core members of that domain.
-- Run after 20260928090000_learning_resources.sql. Safe to run once.
-- =============================================================================

alter table public.team_members
  add column tier text not null default 'core'
    check (tier in ('office_bearer', 'lead', 'core')),
  -- e.g. 'Technical', 'Event Management', 'Marketing', 'Creative' (null for office bearers)
  add column domain text check (domain is null or char_length(domain) between 1 and 60);

-- Best guess for anyone added before this migration; adjust in the admin dashboard.
update public.team_members set tier = 'office_bearer'
  where designation ~* '(president|treasurer|secretary)';
update public.team_members set tier = 'lead'
  where tier = 'core' and designation ~* '(lead|head)';

create index team_members_tier_idx on public.team_members (tier, domain, sort_order);
