<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes (ISSA platform)

- Next.js 16 App Router + Supabase. Middleware is `src/proxy.ts` (Next 16 naming). Caching uses the previous model (`revalidate` exports), not Cache Components.
- Security lives in Postgres: `supabase/migrations/*_issa_schema.sql` holds RLS policies and the SECURITY DEFINER RPCs (registration, check-in, submissions, quiz timing/grading, admin analytics). Clients never write scores, tickets or attendance directly — add new privileged writes as RPCs, and revoke EXECUTE from `anon`/`public` for internal helpers.
- Quiz answer keys are in `quiz_answer_keys` (admin-only). Never select them in participant code paths.
- Play: CTF flags exist only as SHA-256 hashes in `ctf_flags` (RLS on, no policies). Set them with `set_ctf_flag` and check them with `submit_ctf_flag`; never add a client read path. The website flag hunt's flags are deliberately in `src/content/flag-hunt.ts` (hidden in the page source, console, headers, robots.txt and security.txt). Starter challenge hashes live in `src/content/demo-content.json` and are written to `supabase/play-starter.sql` by `npm run db:seed:generate`.
- Demo mode: without `NEXT_PUBLIC_SUPABASE_*` env vars, `src/lib/data/public.ts` serves `src/content/demo-content.json`. Keep the JSON and `supabase/seed.sql` in sync with `npm run db:seed:generate`.
- Dates render in `siteConfig.timezone` on server and client; time-dependent client UI uses `useNow()` / `useHydrated()` to avoid hydration mismatches.
- Admin CRUD tables use the schema-driven `ResourceManager`; define its configs at module scope (inline configs re-trigger loading every render).
- Checks: `npm run typecheck && npm run lint && npm run build`.
