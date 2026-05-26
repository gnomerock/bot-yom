ARG BUN_VERSION=1.1.24
FROM oven/bun:${BUN_VERSION}-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src/ ./src/
COPY public/ ./public/

EXPOSE 8080

CMD ["/usr/local/bin/bun", "src/index.ts"]
