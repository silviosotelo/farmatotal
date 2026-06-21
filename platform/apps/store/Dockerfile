# Store (Next 16). Deriva de ft-base. NEXT_PUBLIC_API_URL se inlinea en build (cliente);
# API_URL es el API interno para el prerender/SSG (alcanzable en la red Docker durante
# el build con --network). El store tiene un BFF con Prisma (libSQL) → prisma generate.
FROM ft-base
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG API_URL
ENV API_URL=$API_URL
WORKDIR /app/apps/store
RUN pnpm exec prisma generate
RUN pnpm exec next build
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
