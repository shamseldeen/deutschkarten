FROM node:24-alpine AS base
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
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/flashcards/package.json ./artifacts/flashcards/
RUN pnpm install --frozen-lockfile --filter @workspace/api-server... --filter @workspace/flashcards...

FROM deps AS builder
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/flashcards/ ./artifacts/flashcards/
RUN pnpm --filter @workspace/api-server run build
RUN BASE_PATH=/flashcards/ pnpm --filter @workspace/flashcards run build

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
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --frozen-lockfile --filter @workspace/api-server... --prod
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/flashcards/dist/public ./artifacts/flashcards/dist/public
EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
