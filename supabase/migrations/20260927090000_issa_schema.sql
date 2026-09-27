-- =============================================================================
-- ISSA Tech Club platform — core schema
--
-- Security model
--   * Every table has Row Level Security enabled. Anonymous visitors can only
--     read published public content.
--   * Anything that must be tamper-proof (event registration + capacity, ticket
--     check-in, submissions, quiz timing and grading) goes through SECURITY
--     DEFINER functions. Clients never write those tables directly.
--   * Quiz answer keys live in their own table that only admins can read, so
--     correct answers never reach participants before the reveal.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'member', 'guest');

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- App settings (singleton row, editable by admins from the dashboard)
-- -----------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  -- e.g. {'college.edu'}; sub-domains such as cs.college.edu also match
  allowed_domains text[] not null default '{}',
  -- reject sign-ups from outside allowed_domains
  restrict_signups boolean not null default false,
  -- give accounts from allowed_domains the 'member' role automatically
  auto_member_for_domains boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true);

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  roll_no text check (char_length(roll_no) <= 40),
  branch text check (char_length(branch) <= 80),
  year smallint check (year between 1 and 6),
  bio text check (char_length(bio) <= 500),
  github_url text,
  linkedin_url text,
  role public.app_role not null default 'guest',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers. SECURITY DEFINER so RLS policies on profiles can call them
-- without recursing into themselves.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.email_domain_allowed(p_email text, p_domains text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from unnest(coalesce(p_domains, '{}')) as d(domain)
    where lower(split_part(p_email, '@', 2)) = lower(trim(d.domain))
       or lower(split_part(p_email, '@', 2)) like '%.' || lower(trim(d.domain))
  );
$$;

-- Create a profile for every new auth user, enforcing the domain policy.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.app_settings;
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_is_college boolean;
  v_year text := v_meta ->> 'year';
begin
  select * into v_settings from public.app_settings where id;
  v_is_college := public.email_domain_allowed(new.email, v_settings.allowed_domains);

  if v_settings.restrict_signups
     and cardinality(v_settings.allowed_domains) > 0
     and not v_is_college then
    raise exception 'Sign-ups are restricted to % email addresses',
      array_to_string(v_settings.allowed_domains, ', ');
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, roll_no, branch, year, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(v_meta ->> 'full_name'), ''), nullif(trim(v_meta ->> 'name'), ''), split_part(new.email, '@', 1)),
    coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture'),
    nullif(trim(v_meta ->> 'roll_no'), ''),
    nullif(trim(v_meta ->> 'branch'), ''),
    case when v_year ~ '^[1-6]$' then v_year::smallint end,
    case when v_is_college and v_settings.auto_member_for_domains then 'member' else 'guest' end::public.app_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their address.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Users may edit their own profile, but only admins may change roles, and the
-- last admin can never be demoted (prevents locking everyone out).
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is null for the service role / SQL editor: allow everything.
  if auth.uid() is null then
    return new;
  end if;

  if new.id <> old.id or new.email <> old.email then
    raise exception 'Profile id and email cannot be changed here';
  end if;

  if new.role <> old.role then
    if not public.is_admin() then
      raise exception 'Only admins can change roles';
    end if;
    if old.role = 'admin'
       and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'Cannot demote the last remaining admin';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- -----------------------------------------------------------------------------
-- Public content: office bearers, projects, hall of fame, gallery
-- -----------------------------------------------------------------------------
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text not null,
  photo_url text,
  bio text,
  linkedin_url text,
  github_url text,
  twitter_url text,
  instagram_url text,
  email text,
  tenure text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  description text,
  tags text[] not null default '{}',
  status text not null default 'ongoing' check (status in ('ongoing', 'completed')),
  repo_url text,
  demo_url text,
  cover_url text,
  contributors text[] not null default '{}',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  recipients text not null,
  category text not null default 'hackathon'
    check (category in ('hackathon', 'ctf', 'certification', 'award', 'publication', 'other')),
  position text,
  description text,
  achieved_on date,
  link_url text,
  image_url text,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Events, registrations (tickets) and submissions
-- -----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  description text,
  category text not null default 'workshop'
    check (category in ('workshop', 'hackathon', 'ctf', 'talk', 'competition', 'meetup', 'other')),
  cover_url text,
  location text,
  mode text not null default 'offline' check (mode in ('offline', 'online', 'hybrid')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_deadline timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  registration_open boolean not null default true,
  members_only boolean not null default false,
  submissions_open boolean not null default false,
  submission_deadline timestamptz,
  submission_guidelines text,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_at_idx on public.events (starts_at);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  -- image URL, or a YouTube / Vimeo / .mp4 URL for videos
  url text,
  thumbnail_url text,
  caption text,
  event_id uuid references public.events (id) on delete set null,
  taken_on date,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ticket_code text not null unique,
  status text not null default 'registered' check (status in ('registered', 'attended', 'cancelled')),
  team_name text check (char_length(team_name) <= 80),
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles (id) on delete set null,
  unique (event_id, user_id)
);

create index registrations_user_idx on public.registrations (user_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  repo_url text,
  demo_url text,
  -- object path inside the private 'submissions' storage bucket
  file_path text,
  team_name text,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'accepted', 'rejected', 'winner')),
  score numeric(6, 2),
  feedback text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index submissions_user_idx on public.submissions (user_id);

-- -----------------------------------------------------------------------------
-- Quizzes
--   mode 'live'       : host advances questions for everyone (Kahoot-style).
--   mode 'self_paced' : each participant plays through on their own clock,
--                       within the optional opens_at/closes_at window.
--   Scoring: correct answers earn points * (1 - elapsed/limit/2), so faster
--   answers score more (between 50% and 100% of the question's points).
-- -----------------------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_id uuid references public.events (id) on delete set null,
  mode text not null default 'live' check (mode in ('live', 'self_paced')),
  status text not null default 'draft' check (status in ('draft', 'published', 'ended')),
  -- live-mode state machine
  phase text not null default 'lobby' check (phase in ('lobby', 'question', 'reveal')),
  current_index integer not null default -1,
  question_started_at timestamptz,
  -- self-paced window
  opens_at timestamptz,
  closes_at timestamptz,
  members_only boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null check (position >= 0),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  options text[] not null check (cardinality(options) between 2 and 6),
  time_limit integer not null default 20 check (time_limit between 5 and 300),
  points integer not null default 1000 check (points between 0 and 5000),
  image_url text,
  explanation text,
  unique (quiz_id, position)
);

-- Correct answers. Admin-only; participants learn them through
-- get_live_state (after reveal) and get_quiz_review (after the quiz ends).
create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_index integer not null check (correct_index >= 0)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  score integer not null default 0,
  correct_count integer not null default 0,
  answered_count integer not null default 0,
  total_time_ms bigint not null default 0,
  -- self-paced progression
  current_index integer not null default -1,
  question_started_at timestamptz,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (quiz_id, user_id)
);

create index quiz_attempts_rank_idx
  on public.quiz_attempts (quiz_id, score desc, correct_count desc, total_time_ms);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  selected_index integer,
  is_correct boolean not null,
  points_awarded integer not null,
  response_ms integer not null,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index quiz_responses_question_idx on public.quiz_responses (question_id);

-- -----------------------------------------------------------------------------
-- Badges
-- -----------------------------------------------------------------------------
create table public.badges (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null,
  -- lucide icon name rendered by the frontend
  icon text not null default 'award',
  sort_order integer not null default 0
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_slug text not null references public.badges (slug) on delete cascade,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles (id) on delete set null,
  primary key (user_id, badge_slug)
);

insert into public.badges (slug, name, description, icon, sort_order) values
  ('first-event',   'First Steps',     'Checked in to your first ISSA event.',             'footprints', 1),
  ('regular',       'Regular',         'Attended five or more ISSA events.',               'calendar-check', 2),
  ('builder',       'Builder',         'Made a submission to a hackathon or challenge.',   'hammer', 3),
  ('quiz-podium',   'Podium Finish',   'Finished in the top three of a quiz.',             'medal', 4),
  ('quiz-champion', 'Quiz Champion',   'Won an ISSA quiz.',                                'trophy', 5),
  ('core-team',     'Core Team',       'Served on the ISSA core committee.',               'shield-check', 6),
  ('ctf-player',    'Flag Hunter',     'Competed in a capture-the-flag with ISSA.',        'flag', 7);

-- Internal: award a badge if it exists. Not callable by clients.
create or replace function public.award_badge(p_user_id uuid, p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_badges (user_id, badge_slug)
  select p_user_id, p_slug
  where exists (select 1 from public.badges where slug = p_slug)
  on conflict do nothing;
$$;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create trigger team_members_updated_at before update on public.team_members
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger achievements_updated_at before update on public.achievements
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger gallery_items_updated_at before update on public.gallery_items
  for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();
create trigger quizzes_updated_at before update on public.quizzes
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.achievements enable row level security;
alter table public.events enable row level security;
alter table public.gallery_items enable row level security;
alter table public.registrations enable row level security;
alter table public.submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- app_settings: readable by everyone (sign-up page shows the domain hint)
create policy "settings readable" on public.app_settings
  for select to anon, authenticated using (true);
create policy "settings admin update" on public.app_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- profiles: private to the owner and admins
create policy "profiles select own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles admin update" on public.profiles
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Public content tables share the same shape of policies.
do $$
declare
  t text;
begin
  foreach t in array array['team_members', 'projects', 'achievements', 'events', 'gallery_items'] loop
    execute format(
      'create policy "public read published" on public.%I for select to anon, authenticated
         using (is_published or (select public.is_admin()))', t);
    execute format(
      'create policy "admin insert" on public.%I for insert to authenticated
         with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admin update" on public.%I for update to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admin delete" on public.%I for delete to authenticated
         using ((select public.is_admin()))', t);
  end loop;
end;
$$;

-- registrations: owners see their own tickets; admins manage all.
-- Inserts only happen through register_for_event().
create policy "registrations select own or admin" on public.registrations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "registrations admin update" on public.registrations
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "registrations admin delete" on public.registrations
  for delete to authenticated
  using ((select public.is_admin()));

-- submissions: owners read their own; admins review. Writes go through
-- upsert_submission(); admins update review fields directly.
create policy "submissions select own or admin" on public.submissions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "submissions admin update" on public.submissions
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "submissions admin delete" on public.submissions
  for delete to authenticated
  using ((select public.is_admin()));

-- quizzes: non-draft quizzes are public; admins manage everything.
create policy "quizzes public read" on public.quizzes
  for select to anon, authenticated
  using (status <> 'draft' or (select public.is_admin()));
create policy "quizzes admin insert" on public.quizzes
  for insert to authenticated with check ((select public.is_admin()));
create policy "quizzes admin update" on public.quizzes
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "quizzes admin delete" on public.quizzes
  for delete to authenticated using ((select public.is_admin()));

-- questions and keys: admin only (participants use the RPCs below)
create policy "questions admin all" on public.quiz_questions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "answer keys admin all" on public.quiz_answer_keys
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- attempts: visible to signed-in users for published quizzes (leaderboards
-- and realtime updates); writes only via RPCs.
create policy "attempts read for visible quizzes" on public.quiz_attempts
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.quizzes q where q.id = quiz_id and q.status <> 'draft')
  );
create policy "attempts admin delete" on public.quiz_attempts
  for delete to authenticated using ((select public.is_admin()));

create policy "responses select own or admin" on public.quiz_responses
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = (select auth.uid())
    )
  );

-- badges
create policy "badges readable" on public.badges
  for select to anon, authenticated using (true);
create policy "badges admin write" on public.badges
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "user badges select own or admin" on public.user_badges
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "user badges admin insert" on public.user_badges
  for insert to authenticated with check ((select public.is_admin()));
create policy "user badges admin delete" on public.user_badges
  for delete to authenticated using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Table privileges (explicit, least privilege; RLS narrows rows further)
-- -----------------------------------------------------------------------------
revoke all on
  public.app_settings, public.profiles, public.team_members, public.projects,
  public.achievements, public.events, public.gallery_items, public.registrations,
  public.submissions, public.quizzes, public.quiz_questions, public.quiz_answer_keys,
  public.quiz_attempts, public.quiz_responses, public.badges, public.user_badges
from anon, authenticated;

grant select on
  public.app_settings, public.team_members, public.projects, public.achievements,
  public.events, public.gallery_items, public.quizzes, public.badges
to anon;

grant select, update on public.app_settings, public.profiles to authenticated;
grant select, insert, update, delete on
  public.team_members, public.projects, public.achievements, public.events,
  public.gallery_items, public.quizzes, public.quiz_questions, public.quiz_answer_keys,
  public.badges
to authenticated;
grant select, update, delete on public.registrations, public.submissions to authenticated;
grant select, delete on public.quiz_attempts to authenticated;
grant select on public.quiz_responses to authenticated;
grant select, insert, delete on public.user_badges to authenticated;

-- =============================================================================
-- RPC: events & tickets
-- =============================================================================

-- ISSA-XXXX-XXXX using an unambiguous 32-character alphabet (no 0/O/1/I).
create or replace function public.generate_ticket_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  -- gen_random_uuid() is backed by a CSPRNG. Byte 6 carries the UUID version
  -- and byte 8 the variant, so we skip them.
  v_bytes bytea := uuid_send(gen_random_uuid());
  v_positions constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9];
  v_code text := '';
  i int;
begin
  foreach i in array v_positions loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return 'ISSA-' || substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
end;
$$;

create or replace function public.register_for_event(p_event_id uuid, p_team_name text default null)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_reg public.registrations;
  v_role public.app_role;
  v_taken integer;
  v_team text := nullif(trim(p_team_name), '');
  v_tries integer := 0;
begin
  if v_uid is null then
    raise exception 'Please sign in to register';
  end if;

  -- Row lock serialises concurrent registrations so capacity can't be exceeded.
  select * into v_event from public.events where id = p_event_id for update;
  if not found or not v_event.is_published then
    raise exception 'Event not found';
  end if;

  select * into v_reg from public.registrations where event_id = p_event_id and user_id = v_uid;
  if found and v_reg.status <> 'cancelled' then
    return v_reg; -- idempotent
  end if;

  if not v_event.registration_open then
    raise exception 'Registrations are closed for this event';
  end if;
  if now() > coalesce(v_event.registration_deadline, v_event.starts_at) then
    raise exception 'The registration deadline has passed';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_event.members_only and v_role not in ('member', 'admin') then
    raise exception 'This event is open to club members only';
  end if;

  if v_event.capacity is not null then
    select count(*) into v_taken
    from public.registrations
    where event_id = p_event_id and status <> 'cancelled';
    if v_taken >= v_event.capacity then
      raise exception 'This event is full';
    end if;
  end if;

  if v_reg.id is not null then
    update public.registrations
       set status = 'registered', team_name = coalesce(v_team, team_name), registered_at = now(),
           checked_in_at = null, checked_in_by = null
     where id = v_reg.id
    returning * into v_reg;
    return v_reg;
  end if;

  loop
    begin
      insert into public.registrations (event_id, user_id, ticket_code, team_name)
      values (p_event_id, v_uid, public.generate_ticket_code(), v_team)
      returning * into v_reg;
      return v_reg;
    exception when unique_violation then
      -- ticket code collision (astronomically rare): try a fresh code
      v_tries := v_tries + 1;
      if v_tries >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.cancel_registration(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.registrations r
     set status = 'cancelled'
   where r.event_id = p_event_id
     and r.user_id = auth.uid()
     and r.status = 'registered'
     and exists (select 1 from public.events e where e.id = r.event_id and e.starts_at > now());
  if not found then
    raise exception 'There is no active registration to cancel';
  end if;
end;
$$;

-- Seats taken per event (registrations are private, so counts come from here).
create or replace function public.get_event_seats(p_event_ids uuid[])
returns table (event_id uuid, registered integer)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id,
         (select count(*)::integer
            from public.registrations r
           where r.event_id = e.id and r.status <> 'cancelled')
    from public.events e
   where e.id = any (p_event_ids)
     and (e.is_published or public.is_admin());
$$;

-- Admin check-in by ticket code (accepts the raw code or a scanned URL).
create or replace function public.check_in_ticket(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_reg public.registrations;
  v_event public.events;
  v_profile public.profiles;
  v_already boolean := false;
  v_attended integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can check in attendees';
  end if;

  v_code := coalesce(substring(v_code from 'ISSA-[0-9A-Z]{4}-[0-9A-Z]{4}'), v_code);

  select * into v_reg from public.registrations where ticket_code = v_code for update;
  if not found then
    raise exception 'Ticket % was not found', v_code;
  end if;
  if v_reg.status = 'cancelled' then
    raise exception 'Ticket % belongs to a cancelled registration', v_code;
  end if;

  if v_reg.status = 'attended' then
    v_already := true;
  else
    update public.registrations
       set status = 'attended', checked_in_at = now(), checked_in_by = auth.uid()
     where id = v_reg.id
    returning * into v_reg;

    perform public.award_badge(v_reg.user_id, 'first-event');
    select count(*) into v_attended
      from public.registrations where user_id = v_reg.user_id and status = 'attended';
    if v_attended >= 5 then
      perform public.award_badge(v_reg.user_id, 'regular');
    end if;
  end if;

  select * into v_event from public.events where id = v_reg.event_id;
  select * into v_profile from public.profiles where id = v_reg.user_id;

  if v_event.category = 'ctf' then
    perform public.award_badge(v_reg.user_id, 'ctf-player');
  end if;

  return jsonb_build_object(
    'already_checked_in', v_already,
    'ticket_code', v_reg.ticket_code,
    'checked_in_at', v_reg.checked_in_at,
    'team_name', v_reg.team_name,
    'attendee', jsonb_build_object(
      'name', v_profile.full_name, 'email', v_profile.email, 'roll_no', v_profile.roll_no,
      'branch', v_profile.branch, 'year', v_profile.year),
    'event', jsonb_build_object('id', v_event.id, 'title', v_event.title, 'starts_at', v_event.starts_at)
  );
end;
$$;

create or replace function public.upsert_submission(
  p_event_id uuid,
  p_title text,
  p_description text default null,
  p_repo_url text default null,
  p_demo_url text default null,
  p_file_path text default null,
  p_team_name text default null
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_sub public.submissions;
  v_first boolean;
  v_repo text := nullif(trim(p_repo_url), '');
  v_demo text := nullif(trim(p_demo_url), '');
begin
  if v_uid is null then
    raise exception 'Please sign in to submit';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found or not v_event.is_published then
    raise exception 'Event not found';
  end if;
  if not v_event.submissions_open then
    raise exception 'Submissions are not open for this event';
  end if;
  if v_event.submission_deadline is not null and now() > v_event.submission_deadline then
    raise exception 'The submission deadline has passed';
  end if;
  if not exists (
    select 1 from public.registrations
     where event_id = p_event_id and user_id = v_uid and status in ('registered', 'attended')
  ) then
    raise exception 'Register for this event before submitting';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'A title is required';
  end if;
  if char_length(p_title) > 200 or char_length(coalesce(p_description, '')) > 5000 then
    raise exception 'Title or description is too long';
  end if;
  if (v_repo is not null and v_repo !~* '^https?://')
     or (v_demo is not null and v_demo !~* '^https?://') then
    raise exception 'Links must start with http:// or https://';
  end if;
  if p_file_path is not null
     and p_file_path not like p_event_id::text || '/' || v_uid::text || '/%' then
    raise exception 'Invalid file path';
  end if;

  v_first := not exists (select 1 from public.submissions where user_id = v_uid);

  insert into public.submissions as s (event_id, user_id, title, description, repo_url, demo_url, file_path, team_name)
  values (p_event_id, v_uid, trim(p_title), nullif(trim(p_description), ''), v_repo, v_demo,
          p_file_path, nullif(trim(p_team_name), ''))
  on conflict (event_id, user_id) do update
     set title = excluded.title,
         description = excluded.description,
         repo_url = excluded.repo_url,
         demo_url = excluded.demo_url,
         file_path = coalesce(excluded.file_path, s.file_path),
         team_name = excluded.team_name,
         status = 'submitted'
  returning * into v_sub;

  if v_first then
    perform public.award_badge(v_uid, 'builder');
  end if;
  return v_sub;
end;
$$;

-- =============================================================================
-- RPC: quizzes
-- =============================================================================

-- Question payload sent to participants: never includes the answer.
create or replace function public.quiz_question_public(p_q public.quiz_questions)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_q.id,
    'position', p_q.position,
    'prompt', p_q.prompt,
    'options', to_jsonb(p_q.options),
    'time_limit', p_q.time_limit,
    'points', p_q.points,
    'image_url', p_q.image_url
  );
$$;

create or replace function public.join_quiz(p_quiz_id uuid)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes;
  v_profile public.profiles;
  v_attempt public.quiz_attempts;
begin
  if v_uid is null then
    raise exception 'Please sign in to join the quiz';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found or v_quiz.status = 'draft' then
    raise exception 'Quiz not found';
  end if;

  select * into v_attempt from public.quiz_attempts where quiz_id = p_quiz_id and user_id = v_uid;
  if found then
    return v_attempt;
  end if;

  if v_quiz.status = 'ended' then
    raise exception 'This quiz has ended';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_quiz.members_only and v_profile.role not in ('member', 'admin') then
    raise exception 'This quiz is open to club members only';
  end if;
  if v_quiz.mode = 'self_paced' then
    if v_quiz.opens_at is not null and now() < v_quiz.opens_at then
      raise exception 'This quiz has not opened yet';
    end if;
    if v_quiz.closes_at is not null and now() > v_quiz.closes_at then
      raise exception 'This quiz has closed';
    end if;
  end if;

  insert into public.quiz_attempts (quiz_id, user_id, display_name, avatar_url)
  values (
    p_quiz_id, v_uid,
    left(coalesce(nullif(trim(v_profile.full_name), ''), split_part(v_profile.email, '@', 1)), 60),
    v_profile.avatar_url
  )
  on conflict (quiz_id, user_id) do nothing
  returning * into v_attempt;

  if v_attempt.id is null then
    select * into v_attempt from public.quiz_attempts where quiz_id = p_quiz_id and user_id = v_uid;
  end if;
  return v_attempt;
end;
$$;

-- Self-paced: return the caller's current question, or advance to the next.
-- The server starts each question's clock when it is first served, so
-- reloading the page can't reset the timer.
create or replace function public.next_question(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes;
  v_attempt public.quiz_attempts;
  v_q public.quiz_questions;
  v_total integer;
  v_answered boolean;
begin
  if v_uid is null then
    raise exception 'Please sign in to play';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found or v_quiz.status = 'draft' then
    raise exception 'Quiz not found';
  end if;
  if v_quiz.mode <> 'self_paced' then
    raise exception 'This quiz is hosted live';
  end if;

  select * into v_attempt from public.quiz_attempts
   where quiz_id = p_quiz_id and user_id = v_uid
   for update;
  if not found then
    raise exception 'Join the quiz first';
  end if;

  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz_id;

  if v_attempt.finished_at is not null then
    return jsonb_build_object('done', true, 'total', v_total, 'server_now', now());
  end if;

  if v_quiz.status = 'ended' or (v_quiz.closes_at is not null and now() > v_quiz.closes_at) then
    update public.quiz_attempts set finished_at = now(), question_started_at = null where id = v_attempt.id;
    return jsonb_build_object('done', true, 'total', v_total, 'server_now', now());
  end if;

  if v_attempt.current_index >= 0 then
    select * into v_q from public.quiz_questions
     where quiz_id = p_quiz_id and position = v_attempt.current_index;
    if found then
      v_answered := exists (
        select 1 from public.quiz_responses where attempt_id = v_attempt.id and question_id = v_q.id
      );
      if not v_answered then
        if now() <= v_attempt.question_started_at + make_interval(secs => v_q.time_limit + 1.5) then
          -- still running: serve the same question again
          return jsonb_build_object(
            'done', false, 'index', v_attempt.current_index, 'total', v_total,
            'question', public.quiz_question_public(v_q),
            'started_at', v_attempt.question_started_at, 'server_now', now());
        end if;
        -- timed out without an answer
        insert into public.quiz_responses (attempt_id, question_id, selected_index, is_correct, points_awarded, response_ms)
        values (v_attempt.id, v_q.id, null, false, 0, v_q.time_limit * 1000)
        on conflict (attempt_id, question_id) do nothing;
        update public.quiz_attempts
           set total_time_ms = total_time_ms + v_q.time_limit * 1000
         where id = v_attempt.id;
      end if;
    end if;
  end if;

  if v_attempt.current_index + 1 >= v_total then
    update public.quiz_attempts
       set current_index = v_total, finished_at = now(), question_started_at = null
     where id = v_attempt.id;
    return jsonb_build_object('done', true, 'total', v_total, 'server_now', now());
  end if;

  update public.quiz_attempts
     set current_index = current_index + 1, question_started_at = now()
   where id = v_attempt.id
  returning * into v_attempt;

  select * into v_q from public.quiz_questions
   where quiz_id = p_quiz_id and position = v_attempt.current_index;

  return jsonb_build_object(
    'done', false, 'index', v_attempt.current_index, 'total', v_total,
    'question', public.quiz_question_public(v_q),
    'started_at', v_attempt.question_started_at, 'server_now', now());
end;
$$;

create or replace function public.submit_answer(p_quiz_id uuid, p_question_id uuid, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes;
  v_attempt public.quiz_attempts;
  v_q public.quiz_questions;
  v_started timestamptz;
  v_limit_ms integer;
  v_elapsed_ms integer;
  v_correct_index integer;
  v_is_correct boolean;
  v_points integer;
  v_response_id uuid;
begin
  if v_uid is null then
    raise exception 'Please sign in to play';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found or v_quiz.status <> 'published' then
    raise exception 'This quiz is not accepting answers';
  end if;

  select * into v_attempt from public.quiz_attempts
   where quiz_id = p_quiz_id and user_id = v_uid
   for update;
  if not found then
    raise exception 'Join the quiz first';
  end if;

  select * into v_q from public.quiz_questions where id = p_question_id and quiz_id = p_quiz_id;
  if not found then
    raise exception 'Question not found';
  end if;
  if p_choice is null or p_choice < 0 or p_choice >= cardinality(v_q.options) then
    raise exception 'Invalid option';
  end if;

  if v_quiz.mode = 'live' then
    if v_quiz.phase <> 'question' or v_quiz.current_index <> v_q.position then
      raise exception 'This question is closed';
    end if;
    v_started := v_quiz.question_started_at;
  else
    if v_attempt.finished_at is not null then
      raise exception 'You have already finished this quiz';
    end if;
    if v_attempt.current_index <> v_q.position then
      raise exception 'This question is closed';
    end if;
    if v_quiz.closes_at is not null and now() > v_quiz.closes_at then
      raise exception 'This quiz has closed';
    end if;
    v_started := v_attempt.question_started_at;
  end if;

  v_limit_ms := v_q.time_limit * 1000;
  v_elapsed_ms := greatest(0, floor(extract(epoch from (now() - v_started)) * 1000))::integer;
  -- 1.5s grace for network latency; scoring is capped at the limit.
  if v_elapsed_ms > v_limit_ms + 1500 then
    raise exception 'Time is up for this question';
  end if;
  v_elapsed_ms := least(v_elapsed_ms, v_limit_ms);

  select correct_index into v_correct_index from public.quiz_answer_keys where question_id = v_q.id;
  v_is_correct := v_correct_index is not null and p_choice = v_correct_index;
  v_points := case
    when v_is_correct then round(v_q.points * (1 - (v_elapsed_ms::numeric / v_limit_ms) / 2))::integer
    else 0
  end;

  insert into public.quiz_responses (attempt_id, question_id, selected_index, is_correct, points_awarded, response_ms)
  values (v_attempt.id, v_q.id, p_choice, v_is_correct, v_points, v_elapsed_ms)
  on conflict (attempt_id, question_id) do nothing
  returning id into v_response_id;

  if v_response_id is null then
    raise exception 'You already answered this question';
  end if;

  update public.quiz_attempts
     set score = score + v_points,
         correct_count = correct_count + (case when v_is_correct then 1 else 0 end),
         answered_count = answered_count + 1,
         total_time_ms = total_time_ms + v_elapsed_ms
   where id = v_attempt.id;

  -- Live quizzes reveal correctness only when the host reveals the answer.
  if v_quiz.mode = 'live' then
    return jsonb_build_object('accepted', true, 'response_ms', v_elapsed_ms);
  end if;
  return jsonb_build_object('accepted', true, 'correct', v_is_correct, 'points', v_points,
                            'response_ms', v_elapsed_ms);
end;
$$;

-- Snapshot of a quiz for participants, spectators and the host console.
create or replace function public.get_live_state(p_quiz_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_quiz public.quizzes;
  v_attempt public.quiz_attempts;
  v_q public.quiz_questions;
  v_resp public.quiz_responses;
  v_total integer;
  v_participants integer;
  v_answered integer;
  v_correct integer;
  v_dist jsonb;
  v_result jsonb;
begin
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found or (v_quiz.status = 'draft' and not v_admin) then
    raise exception 'Quiz not found';
  end if;

  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz_id;
  select count(*) into v_participants from public.quiz_attempts where quiz_id = p_quiz_id;
  if v_uid is not null then
    select * into v_attempt from public.quiz_attempts where quiz_id = p_quiz_id and user_id = v_uid;
  end if;

  v_result := jsonb_build_object(
    'status', v_quiz.status,
    'mode', v_quiz.mode,
    'phase', v_quiz.phase,
    'index', v_quiz.current_index,
    'total', v_total,
    'participants', v_participants,
    'server_now', now(),
    'me', case when v_attempt.id is null then null else jsonb_build_object(
      'score', v_attempt.score,
      'correct_count', v_attempt.correct_count,
      'answered_count', v_attempt.answered_count,
      'finished', v_attempt.finished_at is not null,
      'current_index', v_attempt.current_index
    ) end
  );

  if v_quiz.mode = 'live' and v_quiz.status = 'published'
     and v_quiz.phase in ('question', 'reveal') and v_quiz.current_index >= 0 then
    select * into v_q from public.quiz_questions
     where quiz_id = p_quiz_id and position = v_quiz.current_index;
    if found then
      select count(*) into v_answered
        from public.quiz_responses r
        join public.quiz_attempts a on a.id = r.attempt_id
       where a.quiz_id = p_quiz_id and r.question_id = v_q.id;

      v_result := v_result || jsonb_build_object(
        'question', public.quiz_question_public(v_q),
        'started_at', v_quiz.question_started_at,
        'answered', v_answered
      );

      if v_attempt.id is not null then
        select * into v_resp from public.quiz_responses
         where attempt_id = v_attempt.id and question_id = v_q.id;
        if found then
          v_result := v_result || jsonb_build_object('my_response', jsonb_build_object(
            'selected_index', v_resp.selected_index,
            'is_correct', case when v_quiz.phase = 'reveal' then v_resp.is_correct end,
            'points', case when v_quiz.phase = 'reveal' then v_resp.points_awarded end
          ));
        end if;
      end if;

      -- Answer distribution: host sees it live, everyone sees it on reveal.
      if v_quiz.phase = 'reveal' or v_admin then
        select coalesce(jsonb_agg(cnt order by idx), '[]'::jsonb) into v_dist
          from (
            select gs.idx, (
              select count(*)
                from public.quiz_responses r
                join public.quiz_attempts a on a.id = r.attempt_id
               where a.quiz_id = p_quiz_id and r.question_id = v_q.id and r.selected_index = gs.idx
            ) as cnt
            from generate_series(0, cardinality(v_q.options) - 1) as gs(idx)
          ) d;
        v_result := v_result || jsonb_build_object('distribution', v_dist);
      end if;

      if v_quiz.phase = 'reveal' then
        select correct_index into v_correct from public.quiz_answer_keys where question_id = v_q.id;
        v_result := v_result || jsonb_build_object(
          'correct_index', v_correct,
          'explanation', v_q.explanation
        );
      end if;
    end if;
  end if;

  return v_result;
end;
$$;

create or replace function public.get_leaderboard(p_quiz_id uuid, p_limit integer default 100)
returns table (
  id uuid,
  rank bigint,
  display_name text,
  avatar_url text,
  score integer,
  correct_count integer,
  answered_count integer,
  total_time_ms bigint,
  finished boolean,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         rank() over (order by a.score desc, a.correct_count desc, a.total_time_ms asc),
         a.display_name,
         a.avatar_url,
         a.score,
         a.correct_count,
         a.answered_count,
         a.total_time_ms,
         a.finished_at is not null,
         a.user_id = auth.uid()
    from public.quiz_attempts a
    join public.quizzes q on q.id = a.quiz_id
   where a.quiz_id = p_quiz_id
     and (q.status <> 'draft' or public.is_admin())
   order by a.score desc, a.correct_count desc, a.total_time_ms asc, a.started_at asc
   limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

-- Full answer review, available once the quiz has ended (admins: any time).
create or replace function public.get_quiz_review(p_quiz_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes;
  v_admin boolean := public.is_admin();
  v_attempt_id uuid;
begin
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found or (v_quiz.status = 'draft' and not v_admin) then
    raise exception 'Quiz not found';
  end if;
  if not v_admin
     and v_quiz.status <> 'ended'
     and not (v_quiz.mode = 'self_paced' and v_quiz.closes_at is not null and now() > v_quiz.closes_at) then
    raise exception 'Answers are revealed after the quiz ends';
  end if;

  select id into v_attempt_id from public.quiz_attempts where quiz_id = p_quiz_id and user_id = auth.uid();

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', q.id,
             'position', q.position,
             'prompt', q.prompt,
             'options', to_jsonb(q.options),
             'image_url', q.image_url,
             'correct_index', k.correct_index,
             'explanation', q.explanation,
             'selected_index', r.selected_index,
             'is_correct', r.is_correct,
             'points', r.points_awarded
           ) order by q.position), '[]'::jsonb)
      from public.quiz_questions q
      left join public.quiz_answer_keys k on k.question_id = q.id
      left join public.quiz_responses r on r.question_id = q.id and r.attempt_id = v_attempt_id
     where q.quiz_id = p_quiz_id
  );
end;
$$;

-- Host controls: publish, next, reveal, end, reset, unpublish.
create or replace function public.host_quiz_action(p_quiz_id uuid, p_action text)
returns public.quizzes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes;
  v_total integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can host quizzes';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id for update;
  if not found then
    raise exception 'Quiz not found';
  end if;
  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz_id;

  case p_action
    when 'publish' then
      if v_total = 0 then
        raise exception 'Add at least one question before publishing';
      end if;
      if v_quiz.status = 'published' then
        return v_quiz;
      end if;
      update public.quizzes
         set status = 'published', phase = 'lobby', current_index = -1, question_started_at = null
       where id = p_quiz_id
      returning * into v_quiz;

    when 'unpublish' then
      if exists (select 1 from public.quiz_attempts where quiz_id = p_quiz_id) then
        raise exception 'Reset the quiz (clearing participants) before moving it back to draft';
      end if;
      update public.quizzes
         set status = 'draft', phase = 'lobby', current_index = -1, question_started_at = null
       where id = p_quiz_id
      returning * into v_quiz;

    when 'next' then
      if v_quiz.mode <> 'live' then
        raise exception 'Only live quizzes are advanced by the host';
      end if;
      if v_quiz.status <> 'published' then
        raise exception 'Publish the quiz before starting it';
      end if;
      if v_quiz.current_index + 1 >= v_total then
        return public.host_quiz_action(p_quiz_id, 'end');
      end if;
      update public.quizzes
         set current_index = current_index + 1, phase = 'question', question_started_at = now()
       where id = p_quiz_id
      returning * into v_quiz;

    when 'reveal' then
      if v_quiz.mode <> 'live' or v_quiz.status <> 'published' or v_quiz.phase <> 'question' then
        raise exception 'There is no open question to reveal';
      end if;
      update public.quizzes set phase = 'reveal' where id = p_quiz_id returning * into v_quiz;

    when 'end' then
      if v_quiz.status = 'draft' then
        raise exception 'A draft quiz cannot be ended';
      end if;
      update public.quizzes set status = 'ended' where id = p_quiz_id returning * into v_quiz;
      update public.quiz_attempts
         set finished_at = coalesce(finished_at, now()), question_started_at = null
       where quiz_id = p_quiz_id;
      -- podium badges (only for players who actually scored)
      perform public.award_badge(t.user_id, 'quiz-podium')
         from (
           select user_id from public.quiz_attempts
            where quiz_id = p_quiz_id and score > 0
            order by score desc, correct_count desc, total_time_ms asc
            limit 3
         ) t;
      perform public.award_badge(t.user_id, 'quiz-champion')
         from (
           select user_id from public.quiz_attempts
            where quiz_id = p_quiz_id and score > 0
            order by score desc, correct_count desc, total_time_ms asc
            limit 1
         ) t;

    when 'reset' then
      delete from public.quiz_attempts where quiz_id = p_quiz_id;
      update public.quizzes
         set status = case when status = 'draft' then 'draft' else 'published' end,
             phase = 'lobby', current_index = -1, question_started_at = null
       where id = p_quiz_id
      returning * into v_quiz;

    else
      raise exception 'Unknown action: %', p_action;
  end case;

  return v_quiz;
end;
$$;

-- Replace a quiz's questions and answer keys atomically (admin quiz builder).
create or replace function public.save_quiz_questions(p_quiz_id uuid, p_questions jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_pos integer := 0;
  v_id uuid;
  v_keep uuid[] := '{}';
  v_options text[];
  v_correct integer;
  v_prompt text;
  v_time integer;
  v_points integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can edit quizzes';
  end if;

  perform 1 from public.quizzes where id = p_quiz_id for update;
  if not found then
    raise exception 'Quiz not found';
  end if;
  if exists (select 1 from public.quiz_attempts where quiz_id = p_quiz_id) then
    raise exception 'This quiz already has participants. Reset it before editing questions.';
  end if;
  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'Questions payload must be an array';
  end if;
  if jsonb_array_length(p_questions) > 100 then
    raise exception 'A quiz can have at most 100 questions';
  end if;

  -- Move existing rows out of the way so positions can be reassigned freely.
  update public.quiz_questions set position = position + 100000 where quiz_id = p_quiz_id;

  for v_item in select value from jsonb_array_elements(p_questions) loop
    v_prompt := trim(coalesce(v_item ->> 'prompt', ''));
    if v_prompt = '' then
      raise exception 'Question % has no prompt', v_pos + 1;
    end if;

    select coalesce(array_agg(trim(o.value) order by o.ordinality), '{}')
      into v_options
      from jsonb_array_elements_text(coalesce(v_item -> 'options', '[]'::jsonb)) with ordinality as o(value, ordinality);
    if cardinality(v_options) < 2 or cardinality(v_options) > 6 then
      raise exception 'Question % needs between 2 and 6 options', v_pos + 1;
    end if;
    if exists (select 1 from unnest(v_options) as x where x = '') then
      raise exception 'Question % has an empty option', v_pos + 1;
    end if;

    v_correct := (v_item ->> 'correct_index')::integer;
    if v_correct is null or v_correct < 0 or v_correct >= cardinality(v_options) then
      raise exception 'Question % needs a valid correct answer', v_pos + 1;
    end if;

    v_time := least(greatest(coalesce((v_item ->> 'time_limit')::integer, 20), 5), 300);
    v_points := least(greatest(coalesce((v_item ->> 'points')::integer, 1000), 0), 5000);

    v_id := case
      when (v_item ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (v_item ->> 'id')::uuid
    end;

    if v_id is not null and exists (select 1 from public.quiz_questions where id = v_id and quiz_id = p_quiz_id) then
      update public.quiz_questions
         set position = v_pos, prompt = v_prompt, options = v_options, time_limit = v_time,
             points = v_points, image_url = nullif(trim(v_item ->> 'image_url'), ''),
             explanation = nullif(trim(v_item ->> 'explanation'), '')
       where id = v_id;
    else
      insert into public.quiz_questions (quiz_id, position, prompt, options, time_limit, points, image_url, explanation)
      values (p_quiz_id, v_pos, v_prompt, v_options, v_time, v_points,
              nullif(trim(v_item ->> 'image_url'), ''), nullif(trim(v_item ->> 'explanation'), ''))
      returning id into v_id;
    end if;

    insert into public.quiz_answer_keys (question_id, correct_index)
    values (v_id, v_correct)
    on conflict (question_id) do update set correct_index = excluded.correct_index;

    v_keep := v_keep || v_id;
    v_pos := v_pos + 1;
  end loop;

  delete from public.quiz_questions where quiz_id = p_quiz_id and not (id = any (v_keep));
  update public.quizzes set updated_at = now() where id = p_quiz_id;
  return v_pos;
end;
$$;

-- Public list of quizzes with question / participant counts (questions are
-- admin-only, so counts come from here).
create or replace function public.quiz_catalog()
returns table (
  id uuid,
  title text,
  description text,
  event_id uuid,
  mode text,
  status text,
  phase text,
  opens_at timestamptz,
  closes_at timestamptz,
  members_only boolean,
  question_count integer,
  participant_count integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.title, q.description, q.event_id, q.mode, q.status, q.phase, q.opens_at, q.closes_at,
         q.members_only,
         (select count(*)::integer from public.quiz_questions qq where qq.quiz_id = q.id),
         (select count(*)::integer from public.quiz_attempts a where a.quiz_id = q.id),
         q.created_at
    from public.quizzes q
   where q.status <> 'draft'
   order by case q.status when 'published' then 0 else 1 end, q.created_at desc;
$$;

-- Every quiz (drafts included) with counts, for the admin list.
create or replace function public.admin_quiz_list()
returns table (
  id uuid,
  title text,
  mode text,
  status text,
  phase text,
  created_at timestamptz,
  question_count integer,
  participant_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list quizzes';
  end if;
  return query
    select q.id, q.title, q.mode, q.status, q.phase, q.created_at,
           (select count(*)::integer from public.quiz_questions qq where qq.quiz_id = q.id),
           (select count(*)::integer from public.quiz_attempts a where a.quiz_id = q.id)
      from public.quizzes q
     order by q.created_at desc;
end;
$$;

-- The caller's quiz history with rank (same ordering as get_leaderboard).
create or replace function public.my_quiz_results()
returns table (
  quiz_id uuid,
  title text,
  mode text,
  status text,
  score integer,
  correct_count integer,
  answered_count integer,
  rank bigint,
  players bigint,
  finished boolean,
  started_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.title, q.mode, q.status, a.score, a.correct_count, a.answered_count,
         1 + (select count(*)
                from public.quiz_attempts b
               where b.quiz_id = a.quiz_id
                 and (b.score > a.score
                      or (b.score = a.score and b.correct_count > a.correct_count)
                      or (b.score = a.score and b.correct_count = a.correct_count and b.total_time_ms < a.total_time_ms))),
         (select count(*) from public.quiz_attempts c where c.quiz_id = a.quiz_id),
         a.finished_at is not null,
         a.started_at
    from public.quiz_attempts a
    join public.quizzes q on q.id = a.quiz_id
   where a.user_id = auth.uid()
   order by a.started_at desc;
$$;

-- Aggregate numbers for the landing page.
create or replace function public.public_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'members', (select count(*) from public.profiles where role in ('member', 'admin')),
    'events', (select count(*) from public.events where is_published and starts_at < now()),
    'projects', (select count(*) from public.projects where is_published),
    'achievements', (select count(*) from public.achievements where is_published),
    'quiz_players', (select count(distinct user_id) from public.quiz_attempts)
  );
$$;

-- =============================================================================
-- RPC: admin analytics
-- =============================================================================
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can view analytics';
  end if;

  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'members', (select count(*) from public.profiles where role in ('member', 'admin')),
    'admins', (select count(*) from public.profiles where role = 'admin'),
    'events_upcoming', (select count(*) from public.events where is_published and starts_at > now()),
    'events_total', (select count(*) from public.events),
    'registrations', (select count(*) from public.registrations where status <> 'cancelled'),
    'attended', (select count(*) from public.registrations where status = 'attended'),
    'submissions', (select count(*) from public.submissions),
    'quiz_attempts', (select count(*) from public.quiz_attempts),
    'recent_events', (
      select coalesce(jsonb_agg(x order by x.starts_at desc), '[]'::jsonb)
        from (
          select e.id, e.title, e.slug, e.starts_at, e.capacity,
                 count(r.id) filter (where r.status <> 'cancelled') as registered,
                 count(r.id) filter (where r.status = 'attended') as attended
            from public.events e
            left join public.registrations r on r.event_id = e.id
           group by e.id
           order by e.starts_at desc
           limit 8
        ) x
    ),
    'signups_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'count', w.cnt) order by w.week), '[]'::jsonb)
        from (
          select date_trunc('week', created_at)::date as week, count(*) as cnt
            from public.profiles
           where created_at > now() - interval '12 weeks'
           group by 1
        ) w
    )
  );
end;
$$;

-- =============================================================================
-- Function privileges
-- =============================================================================
-- Internal helpers: never callable through the API.
revoke execute on function public.award_badge(uuid, text) from public, anon, authenticated;
revoke execute on function public.generate_ticket_code() from public, anon, authenticated;
revoke execute on function public.quiz_question_public(public.quiz_questions) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;

-- Signed-in only.
revoke execute on function
  public.register_for_event(uuid, text),
  public.cancel_registration(uuid),
  public.check_in_ticket(text),
  public.upsert_submission(uuid, text, text, text, text, text, text),
  public.join_quiz(uuid),
  public.next_question(uuid),
  public.submit_answer(uuid, uuid, integer),
  public.get_quiz_review(uuid),
  public.host_quiz_action(uuid, text),
  public.save_quiz_questions(uuid, jsonb),
  public.admin_overview(),
  public.admin_quiz_list(),
  public.my_quiz_results()
from public, anon;

grant execute on function
  public.register_for_event(uuid, text),
  public.cancel_registration(uuid),
  public.check_in_ticket(text),
  public.upsert_submission(uuid, text, text, text, text, text, text),
  public.join_quiz(uuid),
  public.next_question(uuid),
  public.submit_answer(uuid, uuid, integer),
  public.get_quiz_review(uuid),
  public.host_quiz_action(uuid, text),
  public.save_quiz_questions(uuid, jsonb),
  public.admin_overview(),
  public.admin_quiz_list(),
  public.my_quiz_results()
to authenticated;

-- Public (anonymous visitors can see seat counts, quiz state and leaderboards).
grant execute on function
  public.get_event_seats(uuid[]),
  public.get_live_state(uuid),
  public.get_leaderboard(uuid, integer),
  public.quiz_catalog(),
  public.public_stats(),
  public.is_admin(),
  public.current_app_role()
to anon, authenticated;

-- =============================================================================
-- Realtime: quiz state changes and leaderboard updates
-- =============================================================================
alter publication supabase_realtime add table public.quizzes, public.quiz_attempts;

-- =============================================================================
-- Storage buckets
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', true, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml', 'video/mp4']),
  ('avatars', 'avatars', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('submissions', 'submissions', false, 10485760,
    array['application/zip', 'application/x-zip-compressed', 'application/pdf', 'image/png', 'image/jpeg',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'])
on conflict (id) do nothing;

-- media: public read via public URLs; only admins write.
create policy "media admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
create policy "media admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
create policy "media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

-- avatars: users manage files under avatars/<their uid>/...
create policy "avatars owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- submissions: private. Path layout: <event_id>/<user_id>/<file>
create policy "submission files owner or admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and ((storage.foldername(name))[2] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "submission files owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy "submission files owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy "submission files owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[2] = (select auth.uid())::text);
