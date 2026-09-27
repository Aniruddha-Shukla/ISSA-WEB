# ISSA Tech Club — web platform

The website and event platform for **ISSA (Information Systems Security Association) / Tech Club**: a public
site, event registration with QR tickets and check-in, hackathon submissions, live and self-paced quizzes with
realtime leaderboards, an admin dashboard with CSV/JSON exports, and a Gemini-powered assistant on every page.

**Stack:** Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS 4 · Framer Motion · Lucide ·
Supabase (Postgres + Row Level Security, Auth, Realtime, Storage) · Google Gemini.

---

## What's inside

| Area                 | Highlights                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public site**      | Hero, about, office bearers (photos + LinkedIn/GitHub/socials), projects with tag + status filters, events timeline (upcoming/past), Hall of Fame, gallery with keyboard-navigable lightbox and YouTube recaps, FAQ, join CTA.                                                                                                               |
| **Events & tickets** | One-click registration (capacity, deadlines, members-only enforced in the database), instant QR ticket + confirmation ID (`ISSA-7F3K-92QX`), downloadable ticket image, `.ics` calendar file, cancellation.                                                                                                                                  |
| **Check-in**         | Admin scanner page: USB/Bluetooth scanner or typed codes, in-browser camera scanning where supported, and phone-camera scanning (the QR opens the check-in page and checks the attendee in automatically). Flags duplicates and cancelled tickets.                                                                                           |
| **Submissions**      | Per-event submission portal (title, team, repo, demo, optional file up to 10 MB in private storage), editable until the deadline; admins review with status, score and feedback.                                                                                                                                                             |
| **Quizzes**          | **Live** (Kahoot-style, host-driven) and **self-paced** modes. Server-timed questions, speed-weighted auto-grading (50–100% of points for correct answers), answer keys that never reach the browser before the reveal, realtime leaderboards, projector view, host console with join QR, auto-reveal, podium, answer review after the quiz. |
| **Accounts & RBAC**  | Email/password + Google OAuth. Roles: **Admin** (core team), **Member**, **Guest**. College-domain emails can be auto-verified as members, or sign-ups restricted to them (enforced by a database trigger).                                                                                                                                  |
| **Profiles**         | Name, roll no, branch, year, avatar, links; tickets, event history, quiz scores and ranks, submissions, badges (awarded automatically for check-ins, submissions, quiz podiums — or manually by admins).                                                                                                                                     |
| **Admin dashboard**  | Analytics overview, events CRUD + attendee management, check-in, quiz builder (JSON import/export) + host console, member roles and badges, site content (team, projects, hall of fame, gallery), sign-up policy, exports.                                                                                                                   |
| **Exports**          | Members, registrations, attendance, quiz leaderboards, every quiz response, submissions — CSV (Excel-safe, formula-injection protected) or JSON.                                                                                                                                                                                             |
| **AI assistant**     | Floating chat on every page, streaming answers from Gemini, grounded in club info, office bearers, **live** event and quiz data, rules and FAQs; links into the site. Falls back to an offline FAQ responder without a key or if the API fails. Rate-limited server-side.                                                                    |

Accessibility: semantic landmarks, skip link, visible focus, keyboard support everywhere (tabs, lightbox, quiz shortcuts
1–6, host → key), screen-reader timer announcements, colour + shape + letter on quiz options, reduced-motion support,
AA contrast. Performance: ISR for public pages, lazy-loaded images/gallery, the chat panel and markdown renderer load
on first open.

---

## Quick start (demo mode — no backend)

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll see the full public site with sample content (a banner says "Demo mode"). Sign-in,
tickets, quizzes and the admin area need Supabase — set it up below.

## Full setup with Supabase

### Option A — local Supabase (Docker)

Requires Docker Desktop running.

```bash
npm run db:start          # starts Postgres/Auth/Realtime/Storage, applies migrations + seed data
npx supabase status -o env
```

Create `.env.local` from `.env.example` and set `NEXT_PUBLIC_SUPABASE_URL` to the `API_URL` value and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the `PUBLISHABLE_KEY` (or `ANON_KEY`) value, then `npm run dev`.
Local email confirmation is off, so new accounts can sign in immediately. `npm run db:reset` rebuilds the database
from scratch.

### Option B — hosted Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema — either paste `supabase/migrations/20260927090000_issa_schema.sql` into **SQL Editor → Run**, or
   `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Optional sample content: run `supabase/seed.sql` in the SQL editor (safe to run twice).
4. **Authentication → URL Configuration**: Site URL = your site (e.g. `https://issa.example.edu`), and add redirect
   URLs `http://localhost:3000/**` and `https://<your-domain>/**`.
5. Copy **Project URL** and the **publishable key** into `.env.local`.
6. Hosted projects confirm email addresses by default and Supabase's built-in mailer is heavily rate-limited — configure
   custom SMTP (Authentication → SMTP) before launch. Optionally switch the email templates to the token-hash flow so
   links work across browsers: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/profile`
   (use `type=recovery&next=/auth/update-password` for password resets).

### Become an admin

Sign up on the site, then run once in the SQL editor (or `npx supabase db` / Studio locally):

```sql
update public.profiles set role = 'admin' where email = 'you@yourcollege.edu';
```

After that, promote others from **Admin → Members**. The database never lets the last admin be demoted.

### College email domains

**Admin → Settings**: list your domains (e.g. `college.edu`; sub-domains match). Choose whether those accounts become
Members automatically and whether _only_ those domains may sign up. Enforcement happens in a Postgres trigger, so it
covers Google sign-in too.

### Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web application).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   (local: `http://127.0.0.1:54321/auth/v1/callback`).
3. Supabase → Authentication → Providers → **Google**: paste the client ID and secret. Locally, set
   `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` and flip `enabled = true` under `[auth.external.google]` in
   `supabase/config.toml`.

When exactly one college domain is configured, the Google button passes it as the `hd` hint so Google pre-selects the
college account.

### AI assistant (Gemini)

Create a key at [Google AI Studio](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` (server-only). The
default model is `gemini-3.5-flash-lite` (fast and inexpensive for FAQ-style chat); override with `GEMINI_MODEL`, e.g.
`gemini-3.8-flash`. Note: `gemini-1.5-flash` was shut down by Google and now returns 404.

The system prompt is rebuilt on each request from `src/content/club.ts` (about, rules, FAQs), `src/config/site.ts`, and
live data (published events, quizzes, office bearers, projects, achievements), so the bot always knows the current
schedule. Without a key, the assistant runs in **offline mode** and answers common questions from the same data.

## Deploying

Step-by-step, zero-cost deployment (Vercel + Supabase Free + Gemini free tier, public URL, email, Google sign-in,
keep-alive and limits): see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### Vercel in brief

1. Import the repository in Vercel.
2. Add the environment variables from `.env.example` (set `NEXT_PUBLIC_SITE_URL` to the production URL).
3. Add the production URL to Supabase's redirect URLs and Google's authorised origins.

Any Node 20.9+ host works (`npm run build && npm start`).

---

## Running an event

1. **Admin → Events → New event.** Set capacity, deadline, members-only, and (for hackathons) submissions + deadline.
   Toggle **Published**.
2. Students register on the event page and get a QR ticket (also under **Profile → My tickets**).
3. At the door open **Admin → Check-in** on a laptop (works with a USB/Bluetooth barcode scanner) or simply scan tickets
   with an admin's phone camera — the link opens the check-in page and records attendance.
4. **Admin → Events → Manage** shows live attendance, lets you undo check-ins, reviews submissions and exports CSVs.

## Hosting a live quiz

1. **Admin → Quizzes → New quiz → Live.** Add questions (or **Import JSON**), set timers/points, **Publish**.
2. Open **Host console** on the projector. Players scan the QR (or open the quiz page) and appear in the lobby.
3. Press **Start** → each question runs on a server-controlled timer; with **Auto-reveal** the answer and vote
   distribution appear when time runs out. Press **→ / Next** to continue.
4. The last **Next** shows the podium, awards badges and unlocks answer reviews. Export the leaderboard or every
   response from the builder. Use **Reset** after rehearsals.

Self-paced quizzes are published with an optional open/close window; each player's question timer starts when the
question is served and survives reloads.

## Security model

- Every table has Row Level Security. Anonymous visitors can read only published content; profiles, tickets,
  submissions and answers are private to their owner and admins.
- Anything that must be tamper-proof runs in `SECURITY DEFINER` Postgres functions: registration (row-locked capacity
  checks), ticket codes (CSPRNG), check-in, submissions, quiz joining, timing, grading, leaderboards and the host
  state machine. Clients can't write scores, tickets or attendance directly.
- Quiz answer keys live in an admin-only table; participants learn correctness only after the reveal (live) or per
  answer without the correct option (self-paced), and full answers after the quiz ends.
- Roles can only change through admins (trigger-enforced), and the last admin can't be demoted.
- The admin area checks the role on the server; the proxy only refreshes sessions and bounces signed-out users.
- Storage: submission files are private (`<event>/<user>/…`), readable by their owner and admins via short-lived
  signed URLs; avatars/media are public but writable only by their owner/admins.
- Post-login redirects are restricted to same-site paths; CSV exports escape spreadsheet formulas; the chat API
  validates input with zod and is rate-limited.

## Project structure

```
supabase/
  migrations/…_issa_schema.sql  tables, RLS policies, RPC functions, storage buckets, realtime
  seed.sql                      generated sample data (npm run db:seed:generate)
src/
  app/                          routes: /, /events, /events/[slug], /quizzes, /quizzes/[id], /gallery,
                                /login, /signup, /profile, /admin/*, /api/chat, /api/admin/export
  components/
    home/  events/  quiz/  gallery/  chat/  auth/  profile/  admin/  layout/  ui/
  config/site.ts                club name, college, contacts, socials, timezone, navigation
  content/club.ts               about, rules, FAQs (shown on the site and fed to the assistant)
  content/demo-content.json     sample team/projects/events/quizzes (demo mode + seed)
  lib/                          Supabase clients, auth helpers, data loaders, chat, CSV, utilities
  proxy.ts                      session refresh + private-route redirect (Next 16 "proxy")
scripts/generate-seed.mjs       builds supabase/seed.sql from demo-content.json
```

## Customising

- Rebrand: `src/config/site.ts` (college name, email, socials, timezone) and `src/content/club.ts`.
- Real content: manage it from **Admin → Site content**, or edit `src/content/demo-content.json` and run
  `npm run db:seed:generate` to regenerate the seed.
- Theme tokens (colours, fonts, animations) live at the top of `src/app/globals.css`.

## Scripts

| Command                                                 | Purpose                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                                           | Development server                                                                  |
| `npm run build` / `npm start`                           | Production build / server                                                           |
| `npm run lint` / `npm run typecheck` / `npm run format` | Quality checks                                                                      |
| `npm run db:start` / `db:stop` / `db:reset`             | Local Supabase (Docker)                                                             |
| `npm run db:seed:generate`                              | Regenerate `supabase/seed.sql` from the demo content                                |
| `npm run test:smoke`                                    | End-to-end test against local Supabase (auth, RLS, tickets, storage, realtime quiz) |

## Production notes

- The chat rate limiter is in-memory (per server instance). For hard limits across many serverless instances, back it
  with Redis/Upstash.
- Realtime uses Postgres Changes, comfortably sized for club events (hundreds of concurrent players). Players poll as a
  fallback if the socket drops.
- Consider adding a Content-Security-Policy header with nonces once third-party embeds are final.
