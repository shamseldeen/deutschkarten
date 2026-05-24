# DeutschKarten

A German vocabulary flashcard app (A1–C1 levels) with article gender coloring, English + Arabic (RTL) translations, AI-generated flashcards via OpenAI, card flip animations, images, and level-based progress tracking. Available as both a web app and a mobile app.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Web: React + Vite (served at `/flashcards/` via Express static middleware)
- Mobile: Expo / React Native (Metro on port 8081, accessed via REPLIT_EXPO_DEV_DOMAIN)

## Where things live

- `artifacts/api-server/` — Express 5 API server + serves web frontend at `/flashcards/`
- `artifacts/flashcards/` — React + Vite web frontend (builds to `dist/public/`)
- `artifacts/mobile/` — Expo React Native mobile app
- `artifacts/mobile/lib/api.ts` — local fetch-based API client for mobile
- `artifacts/mobile/lib/hooks.ts` — React Query hooks for mobile
- `artifacts/mobile/scripts/start-dev.js` — dev wrapper that pre-kills orphan Metro processes
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/` — Drizzle ORM schema

## Architecture decisions

- Web app is served by the API server (Express static middleware), not a separate Vite dev server in production.
- Mobile uses a local `lib/api.ts` fetch client instead of `@workspace/api-client-react` (ESM workspace package causes Metro bundler issues).
- Metro port: 8081 (default). `localPort` in artifact.toml matches this. A pre-kill wrapper (`scripts/start-dev.js`) kills any orphan Metro process on that port before starting.
- React Compiler is disabled in `app.json` (experiments.reactCompiler omitted) to speed up Metro startup.
- Article gender colors: `der` = blue, `die` = red, `das` = green. Level colors: A1=green, A2=teal, B1=blue, B2=purple, C1=crimson.

## Product

- Browse flashcards by CEFR level (A1–C1)
- Each card shows the German word with article gender color, English translation, Arabic translation (RTL), pronunciation, and an image
- Daily review session with spaced repetition-style progress tracking
- AI-powered card generation (OpenAI) by topic and level
- Flip animation on card tap; swipe or button to mark known/unknown
- Level progress bars showing mastery percentage

## User preferences

- Both web and mobile versions of the app should be kept in sync feature-wise.

## Gotchas

- The `artifacts/flashcards: web` workflow always shows "failed" — this is expected. The web app is served by the API server workflow, not the Vite dev workflow. The web app IS accessible at `/flashcards/`.
- Never import `@workspace/api-client-react` in mobile — it's ESM TypeScript that Metro cannot bundle.
- Metro dev server must run on port 8081 (not the web preview port). The `start-dev.js` wrapper handles orphan cleanup.
- Express 5 wildcard routes: use `/*splat` not `/*`.
- `setApiBaseUrl()` (from `artifacts/mobile/lib/api.ts`) is called in `_layout.tsx` at the module level (outside any component) to set the absolute API base URL for Expo.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
