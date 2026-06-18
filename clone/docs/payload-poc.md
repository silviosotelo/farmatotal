# Payload 3 + PostgreSQL — PoC

CMS opcional montado **encima** del clone existente. Coexiste con el `/admin`
custom y la API basada en Prisma+SQLite; no toca nada de eso.

## Layout

- **DB Payload**: PostgreSQL (docker-compose) — separada de la SQLite del clone.
- **Panel admin**: http://localhost:3000/payload-admin
- **REST**: http://localhost:3000/payload-api/<collection>
- **GraphQL**: http://localhost:3000/payload-graphql (playground en `/payload-graphql-playground`)

## Quickstart

```powershell
# 1. Levantar Postgres
docker compose up -d

# 2. Variables de entorno
Copy-Item .env.example .env  # editar PAYLOAD_SECRET si querés

# 3. Instalar deps (Next 16 todavia esta fresco — usar --legacy-peer-deps si npm se queja)
npm install --legacy-peer-deps

# 4. Generar tabla payload_users + resto del schema (Payload corre push automatico en dev)
npm run dev

# 5. Abrir http://localhost:3000/payload-admin → crear primer usuario admin
```

## Que trae el PoC

Colecciones que reflejan tu plan en `farmatotal_plataforma_plan`:

| Collection   | Para que sirve                                                |
| ------------ | ------------------------------------------------------------- |
| `users`      | Auth del panel (admin/editor).                                |
| `media`      | Subidas a `public/uploads`, 3 tamaños generados con sharp.    |
| `categories` | Catalogo de familias (con `fliaCodigo` = origen ERP).         |
| `products`   | Productos con overrides editoriales + `custom` JSONB libre.   |
| `pages`      | Drafts + blocks (hero, richText, productGrid) para landings.  |

## Por que `/payload-admin` y no `/admin`

`src/app/admin/` ya existe en el clone (orders, customers, sync, etc). El PoC
monta Payload en una ruta paralela y separa la DB para que puedas evaluarlo
sin tocar el codigo actual. Si despues querés migrar todo a Payload, alcanza
con borrar el `/admin` viejo y reescribir `routes.admin` en `payload.config.ts`.

## Siguientes pasos sugeridos

1. **Sync ERP → Payload**: portar el sync de `src/lib/sync/` para escribir en
   las collections `categories` + `products` via Local API
   (`payload.create`, `payload.update`). Los campos `overrides` quedan vivos.
2. **Front consume Payload**: en el sitio publico, reemplazar `getProducts`
   por `payload.find({ collection: 'products' })` (cache RSC + revalidation).
3. **Page builder visual**: aprovechar `blocks` + live preview (mismo patron
   que ya usás en santaclara-web v3).
4. **Migrar Prisma**: cuando todo este servido por Payload, dropear
   `dev.db` + el resto de `prisma/`.

## Notas / gotchas

- **Next 16**: `withPayload` ya funciona pero las peer deps pueden quejarse —
  por eso el `--legacy-peer-deps`. Si rompe, fijar `payload` y `@payloadcms/*`
  a la version que liste compatibilidad con Next 16 en sus release notes.
- **importMap**: si agregás custom components al admin, correr
  `npm run payload:generate:importmap` para que se registren.
- **TypeScript**: `npm run payload:generate:types` produce `src/payload-types.ts`
  para tipar `payload.find`/`payload.create` end-to-end.
- **Migraciones**: en dev Payload hace `push`. Para prod, generar migraciones
  con `npm run payload:migrate create` y correr `payload:migrate` en deploy.
