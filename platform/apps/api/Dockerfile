# API (Fastify + Drizzle) — corre con tsx (los packages del monorepo se consumen
# como TS source). Build context = raíz del monorepo.
FROM node:22-slim
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
WORKDIR /app/apps/api
EXPOSE 4000
# NODE_ENV se setea en runtime (compose) para no excluir devDeps (tsx) en el install.
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
