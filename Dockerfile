# syntax = docker/dockerfile:1

ARG BUN_VERSION=1.1.24

# ── Stage 1: build ────────────────────────────────────────────────────────────
# Use Node.js for next build — Bun's worker_threads is incomplete and breaks it.
# Bun binary is copied in for bun install (to honour bun.lock).
FROM node:22-slim AS build

WORKDIR /app

COPY --from=oven/bun:1.1.24 /usr/local/bin/bun /usr/local/bin/bun

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

COPY . .

# Dummy build-time env vars — real secrets are injected by fly.io at runtime.
ENV DATABASE_URL=postgresql://localhost:5432/build \
    DISCORD_CLIENT_ID=build \
    DISCORD_CLIENT_SECRET=build \
    BETTER_AUTH_SECRET=build \
    BETTER_AUTH_URL=http://localhost:8080 \
    NODE_ENV=production

RUN node node_modules/next/dist/bin/next build

# ── Stage 2: production deps only ─────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS prod-deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ── Stage 3: distroless runtime ───────────────────────────────────────────────
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

# Bun binary (runtime)
COPY --from=oven/bun:1.1.24 /usr/local/bin/bun /usr/local/bin/bun

# Production node_modules (no devDeps)
COPY --from=prod-deps /app/node_modules ./node_modules

# Next.js compiled output
COPY --from=build /app/.next ./.next

# Bot source (transpiled at runtime by Bun)
COPY --from=build /app/src ./src

# Static assets
COPY --from=build /app/public ./public

# Entry point and Next.js config
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/package.json ./package.json

EXPOSE 8080

CMD ["/usr/local/bin/bun", "server.ts"]
