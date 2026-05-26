FROM node:24-slim AS base
RUN npm install -g pnpm@10
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/content/package.json ./lib/content/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/integrations-gemini-ai/package.json ./lib/integrations-gemini-ai/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY artifacts/api-server-ba7r/package.json ./artifacts/api-server-ba7r/
COPY artifacts/flashcards-ba7r/package.json ./artifacts/flashcards-ba7r/
RUN pnpm install --frozen-lockfile --filter @workspace/api-server-ba7r... --filter @workspace/flashcards-ba7r...

FROM deps AS builder
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/api-server-ba7r/ ./artifacts/api-server-ba7r/
COPY artifacts/flashcards-ba7r/ ./artifacts/flashcards-ba7r/
RUN pnpm --filter @workspace/api-server-ba7r run build
RUN PORT=3000 BASE_PATH=/ba7r/ pnpm --filter @workspace/flashcards-ba7r run build

FROM node:24-alpine AS runner
RUN npm install -g pnpm@10
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/content/package.json ./lib/content/
COPY lib/integrations-gemini-ai/package.json ./lib/integrations-gemini-ai/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY artifacts/api-server-ba7r/package.json ./artifacts/api-server-ba7r/
RUN pnpm install --frozen-lockfile --filter @workspace/api-server-ba7r... --prod
COPY --from=builder /app/artifacts/api-server-ba7r/dist ./artifacts/api-server-ba7r/dist
COPY --from=builder /app/artifacts/flashcards-ba7r/dist/public ./artifacts/flashcards-ba7r/dist/public
EXPOSE 8083
ENV NODE_ENV=production
ENV PORT=8083
CMD ["node", "--enable-source-maps", "artifacts/api-server-ba7r/dist/index.mjs"]
