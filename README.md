# DeutschKarten

[![CI](https://github.com/shamseldeen/deutschkarten/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/shamseldeen/deutschkarten/actions/workflows/ci.yml?query=branch%3Amain)

A multi-tenant German vocabulary flashcard app (A1–C1) with article-gender colouring, English + Arabic (RTL) translations, AI-generated cards via OpenAI, flip animations, images, and level-based progress tracking.

Ships as **web + mobile + Python desktop**, in two themed tenants:

- **Shams** (amber sun edition)
- **Ba7r** (ocean blue edition)

## Bootstrap a fresh environment

Assumes Node 24 and pnpm 10 (enforced by `engines` and `.nvmrc`).

```bash
pnpm install --frozen-lockfile
pnpm run reset-db    # creates public + ba7r schemas, pushes Drizzle, seeds both tenants
pnpm run check       # typecheck + tests
```

Required secrets (set as env vars; never commit):

- `DATABASE_URL` — Postgres connection string
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk auth
- `SESSION_SECRET` — ≥16 chars
- `OPENAI_API_KEY` *(optional)* — enables `/api/flashcards/generate`
- `ADMIN_USER_IDS` *(optional)* — comma-separated Clerk user IDs for `/api/admin/*`

## Run

| Workflow | Command |
|---|---|
| Shams API + web | `pnpm --filter @workspace/api-server run dev` |
| Ba7r API + web | `pnpm --filter @workspace/api-server-ba7r run dev` |
| Shams mobile (Expo) | `pnpm --filter @workspace/mobile run dev` |
| Ba7r mobile (Expo) | `pnpm --filter @workspace/mobile-ba7r run dev` |
| Kivy desktop | `cd artifacts/kivy-app && python main.py` |

The Vite dev workflows for `flashcards` and `flashcards-ba7r` are not used — their API servers serve the built web assets at `/flashcards/` and `/ba7r/`.

## Layout

```
artifacts/
  api-server/          Shams Express 5 API (serves web at /flashcards/)
  api-server-ba7r/     Ba7r Express 5 API   (serves web at /ba7r/)
  flashcards/          Shams React + Vite web
  flashcards-ba7r/     Ba7r React + Vite web
  mobile/              Shams Expo React Native app
  mobile-ba7r/         Ba7r Expo React Native app
  kivy-app/            Python/Kivy offline-first desktop app
lib/
  api-spec/            OpenAPI source of truth → generates clients
  api-client-react/    Generated React Query hooks (Orval)
  db/                  Drizzle ORM schema + fixtures
  content/             Shared rank ladder, motivations, roadmap
```

## Stack

- pnpm workspaces, Node 24, TypeScript 5.9
- Express 5, PostgreSQL + Drizzle ORM, Zod validation
- React + Vite (web), Expo / React Native (mobile)
- OpenAPI + Orval codegen for typed API clients
- Clerk for auth, OpenAI for card generation
- Multi-tenant: Shams writes to `public.*`, Ba7r writes to `ba7r.*`
- Multi-workspace per user: each user can have up to 3 isolated dashboards (e.g. German→Arabic, German→English) with private flashcards and progress

## License

MIT — fork, learn, build on it.

## More

See `replit.md` for project conventions, gotchas, and architecture decisions.
