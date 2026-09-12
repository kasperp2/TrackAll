FROM oven/bun:latest AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .

FROM base AS dev
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "--bun", "run", "dev" ]

FROM base AS build
RUN bun --bun run build

FROM oven/bun:latest AS production
WORKDIR /app
COPY --from=build /app/.output /app
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "--bun", "run", "/app/server/index.mjs" ]