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
# @pandaclock/db экспортирует через ./dist/*.js → нужен полный build (tsc),
# не только prisma generate. Без этого api typecheck/build падает TS2307.
RUN pnpm --filter @pandaclock/db build
RUN pnpm --filter @pandaclock/api build

# ----- Production-deploy stage -----
# `pnpm deploy` создаёт self-contained директорию со всеми runtime-зависимостями,
# распрямляя workspace-симлинки (без неё runtime не найдёт reflect-metadata и пр.).
FROM build AS prod
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @pandaclock/api deploy --prod /prod/api
# pnpm deploy не пересоздаёт .prisma/client (postinstall не запускается),
# поэтому генерим клиент явно уже внутри bundle, передав schema.prisma.
COPY packages/db/prisma /prod/api/prisma
# prisma CLI попадает в bundle как dependency пакета @pandaclock/db
RUN cd /prod/api && ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# ----- Runtime stage -----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

RUN addgroup --system --gid 1001 pandaclock \
 && adduser  --system --uid 1001 pandaclock

# self-contained bundle: dist + node_modules + package.json
COPY --from=prod --chown=pandaclock:pandaclock /prod/api ./
# Prisma client (generated) — нужен для runtime
COPY --from=build --chown=pandaclock:pandaclock /repo/packages/db ./packages/db

USER pandaclock
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
