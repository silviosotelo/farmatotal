# Admin (Vite SPA) → estático servido por nginx. Deriva de ft-base. VITE_* se inlinean
# en build. El outDir de Vite es 'build' (ver vite.config).
FROM ft-base AS build
ARG VITE_API_URL
ARG VITE_TENANT=default
ENV VITE_API_URL=$VITE_API_URL VITE_TENANT=$VITE_TENANT
WORKDIR /app/apps/admin
RUN pnpm exec vite build

FROM nginx:alpine
COPY apps/admin/nginx.demo.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/build /usr/share/nginx/html
EXPOSE 80
