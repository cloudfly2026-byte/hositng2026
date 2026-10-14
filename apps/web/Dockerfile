# Multi-stage Dockerfile for @cloudfly/web (Next.js 15)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @cloudfly/contracts run build
RUN pnpm --filter @cloudfly/domain run build
RUN pnpm --filter @cloudfly/deployment-adapters run build
RUN pnpm --filter @cloudfly/persistence run prisma:generate || true
RUN pnpm --filter @cloudfly/web run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/web/.next/ ./apps/web/.next/
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/public/ ./apps/web/public/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/apps/web/node_modules/ ./apps/web/node_modules/

EXPOSE 3000

CMD ["pnpm", "--filter", "@cloudfly/web", "run", "start"]
