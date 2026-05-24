# Contributing to DeutschKarten

Thanks for your interest in helping out! This project welcomes contributions of all sizes — bug reports, new flashcard content, language translations, UI polish, or new features.

## Quick start

```bash
pnpm install --frozen-lockfile
pnpm run reset-db    # dev only; refuses to run with NODE_ENV=production
pnpm run check       # typecheck + tests — keep this green
```

Required secrets are documented in the [README](./README.md#bootstrap-a-fresh-environment).

## Ground rules

- **Node 24 + pnpm 10** (pinned via `engines` and `.nvmrc`).
- **Never run `pnpm dev` at the workspace root** — apps run via their per-artifact dev scripts.
- **Never use `console.log` in server code** — use `req.log` in route handlers and the singleton `logger` elsewhere.
- **Keep Shams (amber) and Ba7r (ocean) in feature parity** — if you change one tenant, mirror it in the other.
- **Keep web and mobile in feature parity** when changing user-facing behavior.

## Local CI gate

Before opening a PR, run:

```bash
pnpm run check          # typecheck + tests
pnpm run codegen:check  # fails if generated API client is stale
pnpm run format:check   # Prettier
```

If you change `lib/api-spec/openapi.yaml`, regenerate the client:

```bash
pnpm --filter @workspace/api-spec run codegen
```

If you change the DB schema (`lib/db/src/schema/*.ts`):

```bash
pnpm --filter @workspace/db run push  # dev only
pnpm run seed                          # idempotent
```

## Pull requests

1. Fork and create a feature branch from `main`.
2. Keep PRs focused — one feature or one fix per PR.
3. Include a short description of *what* changed and *why*.
4. Make sure `pnpm run check` passes locally.
5. If you add a new shared lib, add it to the root `tsconfig.json` `references` array.

## Reporting bugs

Open an issue with:

- What you did, what happened, what you expected
- Which tenant (Shams or Ba7r) and surface (web / mobile / desktop)
- Relevant logs (scrub any secrets first)

## Adding flashcards

The baseline corpus lives in `lib/db/src/fixtures/flashcards.json` and seeds both tenants. New cards should include German word, article (der/die/das or none), English + Arabic translation, CEFR level (A1–C1), and ideally an image URL.

## Code style

- Prettier-formatted (`pnpm run format`)
- TypeScript strict mode
- Zod for runtime validation at trust boundaries (API inputs, env vars)

## License

By contributing, you agree your contributions will be licensed under the [MIT License](./LICENSE).
