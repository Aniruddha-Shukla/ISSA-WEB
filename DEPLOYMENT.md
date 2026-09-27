# Deploying ISSA for $0

Everything below runs on free tiers with **no credit card**. Nothing here can bill you: Vercel Hobby and Supabase
Free pause or rate-limit instead of charging, and the Gemini free tier only works while billing is _not_ enabled.

## The stack

| Need                     | Platform                                | Free allowance (Sep 2026)                                                                                                             | Notes                                                                                       |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Website hosting          | **Vercel** (Hobby)                      | 1M function invocations, 100 GB transfer, 5,000 image transformations / month, 300 s functions                                        | **Non-commercial use only** — fine for a college club. Over the limit = paused, not billed. |
| Database, auth, realtime | **Supabase** (Free)                     | 500 MB database, 1 GB file storage, 50,000 monthly active users, 200 concurrent realtime connections, 2 projects                      | Pauses after ~7 days without activity (handled by the keep-alive workflow). No backups.     |
| AI assistant             | **Google AI Studio** (Gemini free tier) | Per-project quota shown at [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit) (~500 requests/day on Flash-Lite) | Resets midnight Pacific. When exhausted the assistant falls back to offline FAQ answers.    |
| Google sign-in           | **Google Cloud** OAuth client           | Free                                                                                                                                  | Basic scopes (email, profile) need no verification.                                         |
| Code & automation        | **GitHub**                              | Free private repos; Actions 2,000 min/month (unlimited on public repos)                                                               | Runs CI and the Supabase keep-alive (a few minutes a month).                                |
| Email (sign-up / reset)  | **Gmail SMTP** (or Brevo free: 300/day) | ~500 emails/day from a club Gmail                                                                                                     | Supabase's built-in mailer is only for testing — it sends a handful per hour.               |
| Domain                   | `<name>.vercel.app`                     | Free                                                                                                                                  | Or a free sub-domain from your college IT, e.g. `issa.yourcollege.edu` (see the end).       |

> **Ownership tip:** create everything with a **club-owned Google account** (e.g. `issa.yourcollege@gmail.com`, with
> 2-step verification) and a **GitHub organization** (free). Accounts owned by one student disappear when they graduate.

---

## Part A — Put the site on a public URL (about 45 minutes)

### 1. Push the code to GitHub

`.env.local` is git-ignored, so no keys are committed.

```bash
cd ~/ISSA
git add .
git commit -m "ISSA platform"
```

Create an empty **private** repository on [github.com/new](https://github.com/new) (e.g. `issa-web`, no README), then:

```bash
git remote add origin https://github.com/<you-or-org>/issa-web.git
git push -u origin main
```

### 2. Create the Supabase project

1. [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub.
2. **New project**: name `issa`, a strong database password (save it in a password manager), region
   **South Asia (Mumbai)** — pick the region closest to your students. Plan: **Free**.
3. When it's ready, apply the schema from your laptop:

   ```bash
   cd ~/ISSA
   npx supabase login
   npx supabase link --project-ref <project-ref>     # the id in your project URL
   npx supabase db push                              # asks for the database password
   ```

   (Alternative: open **SQL Editor**, paste `supabase/migrations/20260927090000_issa_schema.sql`, **Run**.)

4. Optional sample content: SQL Editor → paste `supabase/seed.sql` → Run. Skip this if you'll add real content from
   the admin dashboard.
5. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** key. Never put the _secret_ /
   _service_role_ key in the app or in Vercel.

### 3. Deploy to Vercel

1. [vercel.com](https://vercel.com) → **Sign up** with GitHub (Hobby).
2. **Add New → Project** → import `issa-web`. Framework preset: **Next.js** (auto-detected). Keep the defaults.
3. **Project name** decides your free URL: `issa-web` → `https://issa-web.vercel.app`.
4. **Environment Variables** (add all of these before the first deploy — `NEXT_PUBLIC_*` values are baked in at build time):

   | Name                                   | Value                                         |
   | -------------------------------------- | --------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co`           |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key                           |
   | `NEXT_PUBLIC_SITE_URL`                 | `https://issa-web.vercel.app` (your real URL) |
   | `NEXT_PUBLIC_CLUB_TIMEZONE`            | `Asia/Kolkata`                                |
   | `GEMINI_API_KEY`                       | from step 7 (can be added later)              |
   | `GEMINI_MODEL`                         | `gemini-3.5-flash-lite`                       |

5. **Deploy.** In ~2 minutes the site is live at your `.vercel.app` URL.
6. Optional: **Settings → Functions → Function Region** → Mumbai (`bom1`), next to the database, if your plan offers
   the choice.

Every `git push` to `main` now redeploys automatically. After changing an environment variable, redeploy
(**Deployments → ⋯ → Redeploy**).

### 4. Point Supabase Auth at the public URL

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://issa-web.vercel.app`
- **Redirect URLs**: add `https://issa-web.vercel.app/**` and `http://localhost:3000/**`

### 5. Make yourself admin

1. Open the site → **Join the club** → create your account.
2. Supabase → **SQL Editor**:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@yourcollege.edu';
   ```

3. Refresh the site → avatar menu → **Admin dashboard**.
4. **Admin → Settings**: add your college email domain(s); choose auto-verify and/or "only college emails".
5. **Admin → Site content**: replace the sample office bearers, projects, hall of fame and gallery (or delete them).
   Edit `src/config/site.ts` for the college name, contact email and socials, then push.

### 6. Email that actually arrives (free SMTP)

Hosted Supabase confirms email addresses by default, and its built-in mailer only sends a few messages per hour.

**Gmail (simplest, ~500/day):**

1. Club Google account → **Security** → turn on **2-Step Verification** → **App passwords** → create one named
   "Supabase".
2. Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   host `smtp.gmail.com`, port `587`, username = the club Gmail address, password = the app password,
   sender email = the club Gmail address, sender name `ISSA Tech Club`.
3. **Authentication → Rate Limits**: raise "emails sent per hour" to something like 100.

(Brevo alternative: free account → verify a sender → SMTP relay `smtp-relay.brevo.com:587` with the SMTP key.)

Optional: switch the confirmation and reset email templates to the token-hash links shown in `README.md` so links
work even when opened in a different browser.

### 7. AI assistant key (Gemini)

1. [aistudio.google.com](https://aistudio.google.com) (club Google account) → **Get API key** → **Create API key**.
2. Vercel → Settings → Environment Variables → `GEMINI_API_KEY` → paste → **Redeploy**.
3. **Do not enable billing** on that Google Cloud project — the free tier then can never charge you.

Note: on the free tier Google may use prompts to improve its products. The assistant only sends club information and
the visitor's question, never profile data.

### 8. Google sign-in (recommended — no emails needed)

1. [console.cloud.google.com](https://console.cloud.google.com) → create project **ISSA Web**.
2. **Google Auth Platform → Branding**: app name `ISSA Tech Club`, support email, (no logo — a logo triggers review).
3. **Audience**: External → **Publish app** (so anyone can sign in; email/profile scopes need no verification).
4. **Clients → Create client → Web application**:
   - Authorized JavaScript origins: `https://issa-web.vercel.app`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Supabase → **Authentication → Sign In / Providers → Google** → enable → paste Client ID and Client Secret → Save.

### 9. Keep the free database awake + CI

Supabase pauses free projects after about a week without traffic. The included workflow pings it every 3 days.

1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   `SUPABASE_URL` = project URL, `SUPABASE_PUBLISHABLE_KEY` = publishable key.
2. **Actions** tab → **Keep Supabase awake** → **Run workflow** once; it should go green.
3. The **CI** workflow runs type-check, lint, format and build on every push.

GitHub disables scheduled workflows after 60 days without commits — if the badge turns grey, click **Enable workflow**.
If the project ever does pause, open the Supabase dashboard and click **Restore**.

### 10. Launch checklist

- [ ] Home page loads without the yellow "Demo mode" banner
- [ ] Sign up with a college email → profile shows **Member**
- [ ] Register for an event → QR ticket appears; it's also under **Profile → My tickets**
- [ ] Scan that QR with an admin's phone → the check-in page confirms the attendee
- [ ] Create a quiz → **Publish** → **Host console** → join from a phone → Start → answer → reveal → end
- [ ] **Admin → Exports** downloads a CSV
- [ ] Ask the assistant "What events are coming up?" (header says "Powered by Gemini")
- [ ] Password reset email arrives (tests SMTP)

---

## Part B — Temporary public link from your laptop (no deploy)

Handy for showing the core team before deploying. Needs the **hosted** Supabase from step 2 — a local Supabase at
`127.0.0.1` isn't reachable by other people.

```bash
brew install cloudflared
# .env.local must contain the hosted Supabase URL + publishable key
npm run build
npm start -- -p 3100
```

In a second terminal:

```bash
cloudflared tunnel --url http://localhost:3100
```

It prints a free `https://<random-words>.trycloudflare.com` link. Add `https://*.trycloudflare.com/**` to Supabase's
redirect URLs. The link works only while your laptop and both commands keep running, and it changes each time.

---

## Living within the free tier

| Limit                               | What it means for ISSA                                        | What to do                                                                                      |
| ----------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 200 realtime connections            | ~190 people in one live quiz at once (host + projector count) | Bigger crowds: run two quiz rooms, or use a self-paced quiz (it polls, no socket required).     |
| 1 GB storage                        | Gallery photos + submission files share it                    | Compress photos to < 500 KB (e.g. squoosh.app); submissions are capped at 10 MB — prefer links. |
| 500 MB database                     | Years of events, tickets and quiz answers                     | Nothing, but export old data yearly.                                                            |
| No automatic backups                | A bad delete can't be undone                                  | Monthly: `npx supabase db dump -f backup.sql` (and **Admin → Exports** before big changes).     |
| 5,000 image transformations / month | Vercel resizes gallery/team images                            | If Vercel warns you, set `images: { unoptimized: true }` in `next.config.ts`.                   |
| Gemini daily quota                  | Busy days may exhaust it                                      | Automatic: the assistant switches to offline FAQ answers until the quota resets.                |
| Vercel Hobby = non-commercial       | No paid tickets, ads or sponsorship sales on the site         | Move to Vercel Pro (or another host) if that ever changes.                                      |

## Custom domain for $0

- **College sub-domain (best):** ask college IT for a CNAME `issa.yourcollege.edu → cname.vercel-dns.com`, then add the
  domain in Vercel → Settings → Domains. Update `NEXT_PUBLIC_SITE_URL`, Supabase's Site URL/redirects and the Google
  OAuth origin to match.
- **Student offers:** the GitHub Student Developer Pack has historically included a free one-year domain from partner
  registrars — renewal is paid, so prefer the college sub-domain for the long term.

## Security checklist

- 2-step verification on the club Google, GitHub, Vercel and Supabase accounts.
- The Supabase **secret/service_role key** and the database password never go into the repo, Vercel or the browser.
- `GEMINI_API_KEY` lives only in Vercel (it's server-side; never prefix it with `NEXT_PUBLIC_`).
- If a key leaks: Supabase → API Keys → rotate; AI Studio → delete the key and create a new one; update Vercel; redeploy.
- Keep at least two admins so the club never gets locked out (the database refuses to demote the last admin).
