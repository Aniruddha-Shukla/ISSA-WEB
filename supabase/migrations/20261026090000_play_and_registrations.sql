-- =============================================================================
-- Registration links (Google Form + QR) and the Play section: website flag hunt,
-- CTF arena and Phishing Spotter scores.
-- Run after 20261025090000_team_structure.sql. Safe to run more than once.
--
-- Flags are stored only as SHA-256 hashes in an admin-only table and checked by
-- submit_ctf_flag(); like quiz answer keys, participants can never read them.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------ registration links
create table if not exists public.registration_links (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 1000),
  -- the Google Form (or any) link people register through
  form_url text not null check (form_url ~* '^https?://'),
  -- optional custom QR image; otherwise the site draws a QR code for form_url
  qr_image_url text,
  event_id uuid references public.events (id) on delete set null,
  -- hidden from the site after this moment (optional)
  closes_at timestamptz,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists registration_links_updated_at on public.registration_links;
create trigger registration_links_updated_at before update on public.registration_links
  for each row execute function public.set_updated_at();

alter table public.registration_links enable row level security;
drop policy if exists "public read published" on public.registration_links;
create policy "public read published" on public.registration_links
  for select to anon, authenticated using (is_published or (select public.is_admin()));
drop policy if exists "admin insert" on public.registration_links;
create policy "admin insert" on public.registration_links
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.registration_links;
create policy "admin update" on public.registration_links
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.registration_links;
create policy "admin delete" on public.registration_links
  for delete to authenticated using ((select public.is_admin()));

-- ------------------------------------------------------------------- challenges
create table if not exists public.ctf_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  -- 'hunt' = flags hidden around this website; 'arena' = classic CTF challenges
  kind text not null default 'arena' check (kind in ('hunt', 'arena')),
  category text not null default 'misc' check (category in ('web', 'crypto', 'forensics', 'osint', 'misc')),
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  points integer not null default 100 check (points between 10 and 1000),
  description text not null default '' check (char_length(description) <= 4000),
  hint text check (char_length(hint) <= 500),
  attachment_url text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ctf_flags (
  challenge_id uuid primary key references public.ctf_challenges (id) on delete cascade,
  flag_hash text not null
);

create table if not exists public.ctf_solves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.ctf_challenges (id) on delete cascade,
  points integer not null,
  solved_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);
create index if not exists ctf_solves_challenge_idx on public.ctf_solves (challenge_id, solved_at);

-- wrong guesses, kept for an hour for rate limiting
create table if not exists public.ctf_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.ctf_challenges (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ctf_attempts_user_idx on public.ctf_attempts (user_id, created_at);

drop trigger if exists ctf_challenges_updated_at on public.ctf_challenges;
create trigger ctf_challenges_updated_at before update on public.ctf_challenges
  for each row execute function public.set_updated_at();

alter table public.ctf_challenges enable row level security;
alter table public.ctf_flags enable row level security; -- no policies: RPC access only
alter table public.ctf_solves enable row level security;
alter table public.ctf_attempts enable row level security; -- no policies: RPC access only

drop policy if exists "public read published" on public.ctf_challenges;
create policy "public read published" on public.ctf_challenges
  for select to anon, authenticated using (is_published or (select public.is_admin()));
drop policy if exists "admin insert" on public.ctf_challenges;
create policy "admin insert" on public.ctf_challenges
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.ctf_challenges;
create policy "admin update" on public.ctf_challenges
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.ctf_challenges;
create policy "admin delete" on public.ctf_challenges
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "own solves" on public.ctf_solves;
create policy "own solves" on public.ctf_solves
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ------------------------------------------------------------- phishing scores
create table if not exists public.phishing_scores (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  best_score integer not null check (best_score >= 0),
  best_total integer not null check (best_total > 0),
  plays integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.phishing_scores enable row level security;
drop policy if exists "own score" on public.phishing_scores;
create policy "own score" on public.phishing_scores
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ----------------------------------------------------------------------- badges
insert into public.badges (slug, name, description, icon, sort_order) values
  ('flag-hunter', 'Flag Hunter', 'Found every flag hidden on the ISSA website.', 'flag', 40),
  ('first-blood', 'First Blood', 'First to solve a CTF arena challenge.', 'trophy', 41),
  ('phish-spotter', 'Phish Spotter', 'Perfect score in Phishing Spotter.', 'shield-check', 42)
on conflict (slug) do nothing;

-- ------------------------------------------------------------------- functions

-- Flags are compared case-insensitively, ignoring surrounding spaces.
create or replace function public.ctf_hash(p_flag text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(lower(btrim(coalesce(p_flag, ''))), 'sha256'), 'hex');
$$;

create or replace function public.set_ctf_flag(p_challenge_id uuid, p_flag text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can set flags' using errcode = '42501';
  end if;
  if p_flag is null or char_length(btrim(p_flag)) < 4 or char_length(p_flag) > 200 then
    raise exception 'A flag must be 4–200 characters';
  end if;
  if not exists (select 1 from public.ctf_challenges where id = p_challenge_id) then
    raise exception 'Challenge not found';
  end if;
  insert into public.ctf_flags (challenge_id, flag_hash)
  values (p_challenge_id, public.ctf_hash(p_flag))
  on conflict (challenge_id) do update set flag_hash = excluded.flag_hash;
end;
$$;

create or replace function public.submit_ctf_flag(p_challenge_id uuid, p_flag text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_challenge public.ctf_challenges;
  v_hash text;
  v_first boolean;
  v_badge text;
  v_badges text[] := '{}';
begin
  if v_uid is null then
    raise exception 'Sign in to submit flags' using errcode = '28000';
  end if;
  if char_length(coalesce(p_flag, '')) > 200 then
    return jsonb_build_object('correct', false);
  end if;
  select * into v_challenge from public.ctf_challenges where id = p_challenge_id and is_published;
  if not found then
    raise exception 'Challenge not found';
  end if;
  if exists (select 1 from public.ctf_solves where user_id = v_uid and challenge_id = p_challenge_id) then
    return jsonb_build_object('correct', true, 'already_solved', true, 'points', 0);
  end if;
  if (select count(*) from public.ctf_attempts where user_id = v_uid and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Too many wrong guesses. Wait a minute and try again.';
  end if;

  select flag_hash into v_hash from public.ctf_flags where challenge_id = p_challenge_id;
  if v_hash is null or v_hash <> public.ctf_hash(p_flag) then
    insert into public.ctf_attempts (user_id, challenge_id) values (v_uid, p_challenge_id);
    delete from public.ctf_attempts where user_id = v_uid and created_at < now() - interval '1 hour';
    return jsonb_build_object('correct', false);
  end if;

  v_first := not exists (select 1 from public.ctf_solves where challenge_id = p_challenge_id);
  insert into public.ctf_solves (user_id, challenge_id, points)
  values (v_uid, p_challenge_id, v_challenge.points)
  on conflict do nothing;

  if v_first and v_challenge.kind = 'arena' then
    insert into public.user_badges (user_id, badge_slug) values (v_uid, 'first-blood')
    on conflict do nothing returning badge_slug into v_badge;
    if v_badge is not null then v_badges := v_badges || v_badge; end if;
  end if;
  v_badge := null;
  if v_challenge.kind = 'hunt' and not exists (
    select 1 from public.ctf_challenges c
     where c.kind = 'hunt' and c.is_published
       and not exists (select 1 from public.ctf_solves s where s.challenge_id = c.id and s.user_id = v_uid)
  ) then
    insert into public.user_badges (user_id, badge_slug) values (v_uid, 'flag-hunter')
    on conflict do nothing returning badge_slug into v_badge;
    if v_badge is not null then v_badges := v_badges || v_badge; end if;
  end if;

  return jsonb_build_object(
    'correct', true,
    'already_solved', false,
    'points', v_challenge.points,
    'first_blood', v_first,
    'badges', to_jsonb(v_badges)
  );
end;
$$;

-- Solve counts per challenge, plus whether the caller has solved it.
create or replace function public.ctf_challenge_stats()
returns table (challenge_id uuid, solves bigint, solved_by_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         count(s.user_id),
         coalesce(bool_or(s.user_id = auth.uid()), false)
    from public.ctf_challenges c
    left join public.ctf_solves s on s.challenge_id = c.id
   where c.is_published
   group by c.id;
$$;

create or replace function public.ctf_scoreboard(p_limit integer default 20)
returns table (
  rank bigint,
  display_name text,
  avatar_url text,
  points bigint,
  solves bigint,
  hunt_found bigint,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by sum(s.points) desc, max(s.solved_at) asc),
         left(coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)), 60),
         p.avatar_url,
         sum(s.points),
         count(*),
         count(*) filter (where c.kind = 'hunt'),
         p.id = auth.uid()
    from public.ctf_solves s
    join public.ctf_challenges c on c.id = s.challenge_id and c.is_published
    join public.profiles p on p.id = s.user_id
   group by p.id
   order by sum(s.points) desc, max(s.solved_at) asc
   limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

create or replace function public.submit_phishing_score(p_score integer, p_total integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.phishing_scores;
  v_improved boolean;
  v_badge text;
begin
  if v_uid is null then
    raise exception 'Sign in to save your score' using errcode = '28000';
  end if;
  if p_total is null or p_total < 1 or p_total > 10000 or p_score is null or p_score < 0 or p_score > p_total then
    raise exception 'Invalid score';
  end if;
  select * into v_row from public.phishing_scores where user_id = v_uid;
  v_improved := v_row.user_id is null or p_score::numeric / p_total > v_row.best_score::numeric / v_row.best_total;
  insert into public.phishing_scores (user_id, best_score, best_total)
  values (v_uid, p_score, p_total)
  on conflict (user_id) do update set
    plays = public.phishing_scores.plays + 1,
    best_score = case when v_improved then excluded.best_score else public.phishing_scores.best_score end,
    best_total = case when v_improved then excluded.best_total else public.phishing_scores.best_total end,
    updated_at = now()
  returning * into v_row;
  if p_score = p_total then
    insert into public.user_badges (user_id, badge_slug) values (v_uid, 'phish-spotter')
    on conflict do nothing returning badge_slug into v_badge;
  end if;
  return jsonb_build_object(
    'best_score', v_row.best_score,
    'best_total', v_row.best_total,
    'plays', v_row.plays,
    'improved', v_improved,
    'badge', v_badge
  );
end;
$$;

create or replace function public.phishing_leaderboard(p_limit integer default 10)
returns table (rank bigint, display_name text, avatar_url text, best_score integer, best_total integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by f.best_score::numeric / f.best_total desc, f.updated_at asc),
         left(coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)), 60),
         p.avatar_url,
         f.best_score,
         f.best_total,
         p.id = auth.uid()
    from public.phishing_scores f
    join public.profiles p on p.id = f.user_id
   order by f.best_score::numeric / f.best_total desc, f.updated_at asc
   limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

-- --------------------------------------------------------------------- grants
revoke all on public.registration_links, public.ctf_challenges, public.ctf_flags, public.ctf_solves,
  public.ctf_attempts, public.phishing_scores from anon, authenticated;
grant select on public.registration_links, public.ctf_challenges to anon, authenticated;
grant insert, update, delete on public.registration_links, public.ctf_challenges to authenticated;
grant select on public.ctf_solves, public.phishing_scores to authenticated;

revoke execute on function public.ctf_hash(text) from public, anon, authenticated;
revoke execute on function public.set_ctf_flag(uuid, text) from public, anon;
revoke execute on function public.submit_ctf_flag(uuid, text) from public, anon;
revoke execute on function public.submit_phishing_score(integer, integer) from public, anon;
revoke execute on function public.ctf_challenge_stats() from public;
revoke execute on function public.ctf_scoreboard(integer) from public;
revoke execute on function public.phishing_leaderboard(integer) from public;
grant execute on function public.set_ctf_flag(uuid, text) to authenticated;
grant execute on function public.submit_ctf_flag(uuid, text) to authenticated;
grant execute on function public.submit_phishing_score(integer, integer) to authenticated;
grant execute on function public.ctf_challenge_stats() to anon, authenticated;
grant execute on function public.ctf_scoreboard(integer) to anon, authenticated;
grant execute on function public.phishing_leaderboard(integer) to anon, authenticated;
