-- =============================================================================
-- Learning hub: curated learning resources managed by admins.
-- Run after 20260927090000_issa_schema.sql. Safe to run once.
-- =============================================================================

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 1000),
  url text not null check (url ~* '^https?://'),
  -- grouping on the Learn page, e.g. "Web Security", "Networking", "CTF"
  track text not null default 'Getting Started',
  kind text not null default 'course'
    check (kind in ('course', 'platform', 'video', 'article', 'tool', 'book', 'roadmap', 'notes')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  is_free boolean not null default true,
  -- who made it / where it's from, e.g. "PortSwigger" or "ISSA Workshop"
  source text,
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_resources_track_idx on public.learning_resources (track, sort_order);

create trigger learning_resources_updated_at before update on public.learning_resources
  for each row execute function public.set_updated_at();

alter table public.learning_resources enable row level security;

create policy "public read published" on public.learning_resources
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));
create policy "admin insert" on public.learning_resources
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin update" on public.learning_resources
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete" on public.learning_resources
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.learning_resources from anon, authenticated;
grant select on public.learning_resources to anon;
grant select, insert, update, delete on public.learning_resources to authenticated;
