# AGENTS.md

## Cursor Cloud specific instructions

### What this is
`laviecar` ("Lavie Car Rental") is a Vietnamese self-drive car-rental management app built with **Next.js 16 (App Router) + React 19 + Supabase**. Public landing page (`/`) plus a protected `/dashboard` reached via `/login`.

### Run / build / lint
- Dev server: `npm run dev` (Next.js, defaults to port 3000; set `PORT` to run alongside the sibling apps). Dependency install is handled by the startup update script (`npm install`).
- Build: `npm run build`; start prod: `npm start`.
- Lint: `npm run lint` is defined as `eslint .` but **eslint is not in `devDependencies`**, so it fails with `eslint: not found`. Lint is effectively not configured here — not a regression you introduced.

### Required env (non-obvious gotcha)
- `lib/supabase.ts` reads `NEXT_PUBLIC_SUPABASE_URL!` / `NEXT_PUBLIC_SUPABASE_ANON_KEY!` with non-null assertions and calls `createClient` at import time. Empty values make `createClient` **throw and break every page**. Create a gitignored `.env.local` (see `.env.example`) before running.
- Placeholder values are enough to boot the UI:
  - `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<any non-empty string>`
- For real data add genuine Supabase credentials (see `SUPABASE_SETUP.md`); schema lives in `pawnshop_setup.sql`.

### Login without a database
`contexts/auth-context.tsx` tries Supabase first, then **falls back to hardcoded demo users** when Supabase is unreachable, so you can reach the dashboard with placeholder env. Data-write features need a real Supabase project to persist.
