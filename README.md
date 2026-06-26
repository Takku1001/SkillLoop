# SkillLoop

> **Author:** Muhammad Rayyan Malik

A peer skill-exchange for students. List skills you can teach and skills you want to
learn, and SkillLoop surfaces direct matches plus **trade cycles** — circular exchanges
where everyone teaches one person and learns from another. Includes ranked cycle
suggestions, "1 connection away" near-misses, real-time chat with read receipts and
typing indicators, per-session Jitsi video links, an in-chat `/schedule` command, and a
D3 force-directed view of the skill network.

## Tech stack

- **Frontend:** Vite + Svelte (`web/`), dark design system, spring-physics animation, D3
- **Backend:** Node + Express (`src/`) — REST API under `/api/skills`
- **Database / realtime:** Supabase (Postgres + Realtime)
- **Auth:** bcrypt password hashing

In production the Express server serves the built frontend (`dist/`) and the API from a
single origin.

## Project structure

```
src/            Express API (routes, db pool)  — backend
web/            Svelte frontend (Vite)         — UI
database/       Canonical schema + seed SQL
supabase/       Timestamped migrations
scripts/        One-off maintenance helpers
dist/           Built frontend (generated; gitignored)
```

## Prerequisites

- Node.js **18+**
- A Supabase project (Postgres + Realtime). The schema lives in `database/schema.sql`
  and `supabase/migrations/`.

## Environment variables

Create a `.env` in the project root (it is gitignored — never commit it):

```
DATABASE_URL=postgresql://<user>:<password>@<host>:6543/postgres?pgbouncer=true
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
PORT=3000            # optional locally; the host sets it in production
```

- `DATABASE_URL` — Supabase connection string (the pooled `6543` endpoint).
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — used by the browser for Supabase Realtime.
  The anon key is public-safe and is served to the client via `/api/config`.

## Run locally (development)

Two processes — the API and the Vite dev server (which proxies `/api` to the API):

```bash
npm install
npm start        # terminal 1 — Express API on http://localhost:3000
npm run web      # terminal 2 — Vite dev UI on http://localhost:5173
```

Open **http://localhost:5173**.

## Run as a single service (production-style)

```bash
npm install
npm run build    # builds the frontend into dist/
npm start        # Express serves dist/ + the API on http://localhost:3000
```

## Deploy (Railway)

The repo is zero-config for Railway/Render: `npm install` → `npm run build` → `npm start`.

1. Push to GitHub, then create a Railway project from the repo (**New Project → Deploy
   from GitHub repo**).
2. Add the environment variables above in the service's **Variables** tab. Do **not** set
   `PORT` — the platform injects it.
3. **Settings → Networking → Generate Domain** to get a public URL.

Every push to `main` auto-redeploys.

## Scripts

- `scripts/maintenance-cleanup-and-skills.js` — removes test/spam users and seeds extra
  skills (`node scripts/maintenance-cleanup-and-skills.js`).
- `scripts/verify-supabase-persistence.js` — quick DB connectivity/persistence check.

## Database / migrations

`database/schema.sql` is the canonical schema. Incremental changes live in
`supabase/migrations/` (applied to the Supabase project), and `database/schema.sql` is
kept in sync with them.
