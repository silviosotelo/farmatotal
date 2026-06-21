# Store (Next 16). NEXT_PUBLIC_API_URL se inyecta en BUILD (se inlinea en el bundle
# del cliente). API_URL (SSR interno) se pasa en runtime. Build context = raíz monorepo.
FROM node:22-slim
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
WORKDIR /app/apps/store
RUN pnpm exec next build
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
