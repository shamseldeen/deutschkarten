# DeutschKarten

A German vocabulary flashcard app (A1–C1 levels) with article gender coloring, English + Arabic (RTL) translations, AI-generated flashcards via Gemini 2.5 Flash, card flip animations, images, and level-based progress tracking. Available as both a web app and a mobile app (Shams + Ba7r tenants).

## Bootstrap a fresh environment

Five commands. Assumes Node 24 and pnpm 10 (enforced by `engines` and `.nvmrc`).

```bash
pnpm install --frozen-lockfile           # exact lockfile reproduction
pnpm run reset-db                        # creates public + ba7r schemas, pushes Drizzle,
                                         # seeds both tenants from the JSON fixture.
                                         # Refuses to run with NODE_ENV=production.
pnpm run check                           # typecheck + tests must pass
```

On an environment that already has the schemas, you can run `pnpm run seed` alone — it is idempotent and warns (without erroring) if a tenant schema is missing.

Required secrets (managed via the environment-secrets workflow, never committed):

- `DATABASE_URL` — Postgres connection string
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk auth
- `SESSION_SECRET` — ≥16 chars, used for session cookies
- `ADMIN_USER_IDS` _(optional)_ — comma-separated Clerk user IDs allowed into `/api/admin/*`
- `GEMINI_API_KEY` _(optional)_ — enables `/api/flashcards/generate` (Gemini 2.5 Flash via Replit integration)

Both API servers validate their env via `src/env.ts` (Zod) at startup. Missing or malformed config fails fast with an aggregated error list instead of cryptic runtime 500s.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — Shams API server (port 8080, web at `/flashcards/`)
- `pnpm --filter @workspace/api-server-ba7r run dev` — Ba7r API server (web at `/ba7r/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run test` — run all package tests (currently `@workspace/content`)
- `pnpm run check` — typecheck + test (use this as your local CI gate)
- `pnpm run build` — typecheck + build all packages
- `pnpm run seed` — idempotent seed of both `public.flashcards` and `ba7r.flashcards` from `lib/db/src/fixtures/flashcards.json`
- `pnpm run reset-db` — drop + recreate + reseed (dev only; refuses production)
- `pnpm run codegen:check` — fail if OpenAPI codegen output is stale
- `pnpm run format` / `pnpm run format:check` — Prettier write / check
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from `lib/api-spec/openapi.yaml`
- `pnpm --filter @workspace/db run push` — push Drizzle schema (dev only)

## Stack

- pnpm workspaces, Node.js 24 (pinned via `engines` and `.nvmrc`), TypeScript 5.9
- API: Express 5 (port 8080), Zod env validation at startup
- DB: PostgreSQL + Drizzle ORM, multi-tenant via `public` (Shams) and `ba7r` schemas
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Web: React + Vite (Shams at `/flashcards/`, Ba7r at `/ba7r/`, served by their API servers)
- Mobile: Expo / React Native (Metro on port 8081, accessed via `REPLIT_EXPO_DEV_DOMAIN`)
- Tests: `node:test` (zero extra deps) — pure-function units in `@workspace/content`

## Where things live

- `artifacts/api-server/` — Shams Express 5 API + serves web at `/flashcards/`
- `artifacts/api-server-ba7r/` — Ba7r Express 5 API; `src/preload.ts` forces `search_path=ba7r,public` for tenant isolation; router mounted at both `/ba7r-api` and `/ba7r-api/api`
- `artifacts/flashcards/`, `artifacts/flashcards-ba7r/` — React + Vite web frontends
- `artifacts/mobile/`, `artifacts/mobile-ba7r/` — Expo React Native mobile apps
- `artifacts/mobile/lib/api.ts` — local fetch-based API client for mobile
- `artifacts/mobile/lib/hooks.ts` — React Query hooks for mobile
- `artifacts/mobile/scripts/start-dev.js` — dev wrapper that pre-kills orphan Metro processes
- `artifacts/kivy-app/` — Python/Kivy desktop app (offline-first + optional cloud sync)
- `artifacts/kivy-app/auth.py` — Clerk JWT storage (`~/.deutschkarten/auth.json`, chmod 600)
- `artifacts/kivy-app/sync.py` — push/pull progress on sign-in
- `artifacts/api-server/src/env.ts` — startup env validation (mirrored in `api-server-ba7r/src/env.ts`)
- `artifacts/api-server/src/routes/auth.ts` — `/api/auth/sign-in` and `/api/auth/sign-up` (Clerk Backend SDK, IP rate-limited 10/min)
- `artifacts/api-server/src/routes/reports.ts` — community card moderation: POST `/api/flashcards/:id/report` (user, 20/hr), GET `/api/admin/reports`, POST `/api/admin/reports/:id/dismiss`, POST `/api/admin/flashcards/:id/unhide`, DELETE `/api/admin/flashcards/:id`. Auto-hides cards at 3 distinct reporters.
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/` — Drizzle ORM schema
- `lib/db/src/fixtures/flashcards.json` — canonical 114-card baseline corpus (seeds both tenants)
- `lib/content/` — shared rank ladder, motivations, roadmap, study habits + `computeRank`, `pickMotivationOfTheDay`; consumed by all 4 web/mobile apps
- `lib/content/src/content.test.ts` — `node:test` units for `computeRank`, motivation rotation, roadmap invariants
- `scripts/src/seed.ts` — idempotent seeder for both tenants from the JSON fixture
- `scripts/src/reset-db.ts` — drop + push + seed; refuses production
- `scripts/src/codegen-check.ts` — fails if `git diff` is non-empty after codegen

## Architecture decisions

- Web apps are served by their API servers (Express static middleware), not separate Vite dev servers in production.
- Mobile uses a local `lib/api.ts` fetch client instead of `@workspace/api-client-react` (ESM workspace package causes Metro bundler issues).
- Metro port: 8081 (default). `localPort` in `artifact.toml` matches this. A pre-kill wrapper (`scripts/start-dev.js`) kills orphan Metro on that port before starting.
- React Compiler is disabled in `app.json` (experiments.reactCompiler omitted) to speed up Metro startup.
- Tenant isolation: Shams writes to `public.*`, Ba7r writes to `ba7r.*`. Ba7r's `preload.ts` injects `search_path=ba7r,public` into `DATABASE_URL` so the same Drizzle schema works for both tenants.
- Article gender colors: `der` = blue, `die` = red, `das` = green. Level colors: A1=green, A2=teal, B1=blue, B2=purple, C1=crimson. Shams theme = amber sun; Ba7r theme = ocean blue.
- Shared content (`@workspace/content`) is the canonical source for rank data, motivation pool, roadmap, and ranking math — never copy these arrays back into individual apps.

## Product

- Browse flashcards by CEFR level (A1–C1)
- Each card shows the German word with article gender color, English + Arabic (RTL) translation, pronunciation, and image
- Daily review with progress tracking + streaks
- AI-powered card generation (OpenAI) by topic and level (rate-limited)
- Flip animation on card tap; swipe or button to mark known/unknown
- Level progress bars + 10-tier sea-creature rank ladder (Tide Pool Crab → Kraken Master)

## User preferences

- Both web and mobile versions of the app should be kept in sync feature-wise.
- Shams (amber) and Ba7r (ocean) apps must stay feature-parity.

## Gotchas

- The `artifacts/flashcards: web` and `artifacts/flashcards-ba7r: web` workflows always show "failed" — that's expected. The web apps are served by their API server workflows, not the Vite dev workflows. The web apps ARE accessible at `/flashcards/` and `/ba7r/`.
- **Only one Expo app can be reached via Expo Go at a time.** Both `artifacts/mobile: expo` and `artifacts/mobile-ba7r: expo` workflows bind to the same `$REPLIT_EXPO_DEV_DOMAIN`, so the dev URL routes to whichever Metro started first (usually Shams). To preview the _other_ tenant in Expo Go: in the Replit workflows panel, **stop the one you don't want and restart the one you do want**, then re-scan the URL. The in-app title on each home screen tells you which tenant you're currently on (`Shams DeutschKarten · Sun edition` vs `Ba7r DeutschKarten · Ocean edition`).
- Never import `@workspace/api-client-react` in mobile — it's ESM TypeScript that Metro cannot bundle.
- Metro dev server must run on port 8081 (not the web preview port). The `start-dev.js` wrapper handles orphan cleanup.
- Express 5 wildcard routes: use `/*splat` not `/*`.
- `setApiBaseUrl()` (from `artifacts/mobile/lib/api.ts`) is called in `_layout.tsx` at the module level (outside any component) so the absolute API base URL is set before any hook runs.
- Ba7r mobile rank URLs go through `/ba7r/ranks/...` (not `/flashcards/ranks/...`). Ba7r API routes are mounted at both `/ba7r-api` and `/ba7r-api/api` because the spec was written with `/api` baked in.
- Never use `console.log` in server code — use `req.log` in routes and the singleton `logger` elsewhere (enforced by convention; lint rule recommended).
- Do not run `pnpm dev` at the workspace root — apps are started by Replit workflows that provide `PORT` and `BASE_PATH`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the API contract — regenerate clients with `pnpm --filter @workspace/api-spec run codegen` after any change
