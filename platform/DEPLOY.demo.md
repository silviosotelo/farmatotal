# Deploy demo (Docker + Cloudflare Tunnel)

Stack de demostración corriendo en **192.168.41.34** (Ubuntu, Docker) expuesto por
Cloudflare Tunnel en:

- Tienda:  https://tienda.rohekawebservices.online
- Admin:   https://admin.rohekawebservices.online
- API:     https://api.rohekawebservices.online

## Arquitectura

- `Dockerfile.base` → imagen `ft-base`: instala el monorepo UNA vez (la red del host es
  lenta). `apps/{api,store,admin}/Dockerfile` derivan de `ft-base` (no reinstalan).
- `docker-compose.demo.yml`: servicios `api` (tsx), `store` (next start), `admin`
  (nginx estático), `redis`, `cloudflared` — todos en la red `ft-demo-net`. cloudflared
  llega a los servicios por nombre (`http://store:3000`, `http://admin:80`, `http://api:4000`).
- DB: se reusa la del host `192.168.41.34:5433/farmatotal_cms` (con datos + migraciones).
- Single-tenant: `STORE_TENANT=default`, `MULTI_DOMAIN` off.
- Túnel propio `farmatotal-demo` (id `edc4ac43-...`), creds en `cloudflared/`.

## Secretos (NO versionados, viven en el .34)

- `.env.demo.api` — DATABASE_URL, JWT secrets, CORS_ORIGINS (incluye los 3 subdominios),
  COOKIE_DOMAIN=.rohekawebservices.online, REDIS_URL=redis://redis:6379.
- `cloudflared/config.yml` + `cloudflared/edc4ac43-...json` (credenciales del túnel).

## Pasos (en el host .34, dir ~/farmatotal)

```sh
# 1. Imagen base (1 install, ~lento la 1ra vez)
docker build -f Dockerfile.base -t ft-base .

# 2. api + admin (rápidos)
docker compose -f docker-compose.demo.yml build api admin
docker compose -f docker-compose.demo.yml up -d api redis

# 3. Store: el prerender/SSG hace fetch al API → buildear con el API alcanzable.
#    buildkit NO soporta --network <custom>, así que se usa --network host + la IP
#    del contenedor api (NEXT_PUBLIC_API_URL = URL pública para el cliente).
API_IP=$(docker inspect ft-demo-api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
docker build --network host \
  --build-arg NEXT_PUBLIC_API_URL=https://api.rohekawebservices.online \
  --build-arg API_URL=http://$API_IP:4000 \
  -f apps/store/Dockerfile -t farmatotal-demo-store .

# 4. Levantar todo (store, admin, cloudflared)
docker compose -f docker-compose.demo.yml up -d
```

## Actualizar a una versión nueva

```sh
# traer cambios (git archive desde la máquina de dev, o git pull si hay auth)
docker build -f Dockerfile.base -t ft-base .        # si cambió código/deps
# repetir pasos 2–4
docker compose -f docker-compose.demo.yml up -d --force-recreate
```

## DNS / túnel (ya hecho)

```sh
sudo cloudflared tunnel create farmatotal-demo
sudo cloudflared --config /dev/null tunnel route dns --overwrite-dns <UUID> tienda.rohekawebservices.online
# idem admin. / api.
```
