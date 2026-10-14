# Multi-stage Dockerfile for @cloudfly/api
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cloudfly/contracts run build
RUN pnpm --filter @cloudfly/domain run build
RUN pnpm --filter @cloudfly/deployment-adapters run build
RUN pnpm --filter @cloudfly/persistence run prisma:generate || true
RUN pnpm --filter @cloudfly/persistence run build || true
RUN pnpm --filter @cloudfly/api run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/apps/api/node_modules/ ./apps/api/node_modules/

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
