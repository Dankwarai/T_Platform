# T_Flatform

Tailor management platform — see [CONCEPT.md](./CONCEPT.md) for the full
product concept, data model, tech stack, and API design.

## Structure

- `apps/web` — Next.js (TypeScript, Tailwind)
- `apps/mobile` — Expo (React Native, TypeScript)
- `packages/types` — shared TypeScript types matching the Phase 1 data model
- `packages/supabase-client` — shared Supabase client factory
- `supabase/` — database migrations (Phase 1 schema + RLS) and seed data

## Getting started

```bash
npm install
cp .env.example apps/web/.env.local   # fill in Supabase URL/anon key
cp .env.example apps/mobile/.env      # same, using EXPO_PUBLIC_ vars

npm run dev         # runs all apps via Turborepo
npm run typecheck   # typecheck all packages
npm run build        # build all apps
```

Database migrations live in `supabase/migrations/`. For local development:

```bash
npx supabase start   # spins up Postgres/Auth/Storage/Studio via Docker
npx supabase stop    # when done
```

This has been verified — both Phase 1 migrations apply cleanly, RLS is
enabled on all 8 tables, and seed data (garment types + measurement fields)
loads correctly. Studio is at http://127.0.0.1:54323 once running.

Once a real Supabase project exists, link and push to it:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```
