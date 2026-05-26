### syntax=docker/dockerfile:1.7
# Multi-stage сборка для @pandaclock/api.
# Запуск из корня monorepo: docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# ----- Dependencies stage -----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @pandaclock/api... --filter @pandaclock/db

# ----- Build stage -----
FROM deps AS build
COPY apps/api ./apps/api
RUN pnpm --filter @pandaclock/db prisma generate
RUN pnpm --filter @pandaclock/api build

# ----- Runtime stage -----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

RUN addgroup --system --gid 1001 pandaclock \
 && adduser  --system --uid 1001 pandaclock

COPY --from=build --chown=pandaclock:pandaclock /repo/apps/api/dist ./dist
COPY --from=build --chown=pandaclock:pandaclock /repo/apps/api/package.json ./package.json
COPY --from=build --chown=pandaclock:pandaclock /repo/node_modules ./node_modules
COPY --from=build --chown=pandaclock:pandaclock /repo/packages ./packages

USER pandaclock
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
