# Admin (Vite SPA) → build estático servido por nginx. VITE_API_URL/VITE_TENANT se
# inyectan en BUILD (se inlinean). Build context = raíz monorepo.
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
ARG VITE_API_URL
ARG VITE_TENANT=default
ENV VITE_API_URL=$VITE_API_URL VITE_TENANT=$VITE_TENANT
WORKDIR /app/apps/admin
RUN pnpm exec vite build

FROM nginx:alpine
COPY apps/admin/nginx.demo.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/build /usr/share/nginx/html
EXPOSE 80
