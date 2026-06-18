# Farmatotal Platform — Arquitectura propuesta

3 proyectos independientes que hablan entre si por HTTP/JSON. Migracion desde
WP+Woo en fases, sin romper el sitio vivo.

## Layout monorepo (pnpm + turborepo)

```
platform/
├── apps/
│   ├── api/          ← BackEnd TS/Node + PostgreSQL (Fastify o NestJS)
│   ├── admin/        ← Ecme dashboard (Vite SPA) — base RWS-CRM/demo
│   └── store/        ← Tienda Next 16 SSR — base FARMATOTAL/clone
├── packages/
│   ├── shared-types/ ← DTOs Zod + tipos TS compartidos (FUENTE DE VERDAD)
│   ├── sdk/          ← Cliente TS auto-generado del OpenAPI de api
│   └── ui-tokens/    ← Design tokens / colores marca compartidos
├── docker-compose.yml
└── turbo.json
```

Ventaja: un solo `pnpm install`, build paralelo, tipos compartidos sin
duplicar, refactor cross-app en un solo PR.

## apps/api — BackEnd

| Capa | Eleccion | Por que |
|---|---|---|
| Runtime | Node 22 LTS | LTS estable, fetch nativo, perf parejo a Bun para esto |
| Framework | **Fastify v5** | 2x mas rapido que Express, plugin system, schema-first con Zod, sin decoradores magicos |
| ORM | **Drizzle ORM** | SQL-first, zero codegen, types end-to-end, migraciones via `drizzle-kit`, soporta JSONB nativo |
| Validacion | Zod | Schemas compartidos con front via packages/shared-types |
| Auth | JWT access (15min) + refresh httpOnly cookie | SPA admin + SSR store, sin lock-in |
| Background | BullMQ + Redis | Para sync ERP, emails, notificaciones |
| Storage | S3-compatible (MinIO local, R2/Wasabi prod) | Imagenes de producto, uploads |
| Observabilidad | Pino + OpenTelemetry | Logs estructurados |
| Docs API | OpenAPI 3.1 auto desde Zod (`fastify-zod`) | SDK auto-genera tipos para fronts |

Modulos a portar desde WP+Woo (memoria `farmatotal_plataforma_plan`):
- **Catalogo**: products, categories, brands, tags, images, custom JSONB
- **Multi-inventario**: branches (sucursales), inventory por branch, reglas
- **Pedidos**: orders, lines, status machine, eventos
- **Clientes**: customers, addresses, fav, historial
- **Cupones/promos**: rules engine basico
- **Sync ERP**: jobs reindex selectivo (memoria `farmatotal_sincronizador`)
- **Pagos**: Bancard, webhook handler
- **CMS**: pages, blocks JSONB (page builder), media
- **Settings**: clave-valor por modulo

## apps/admin — Ecme

Base: `C:\Users\sotelos\RWS-CRM\demo` (React 19 + Vite + Tailwind +
TanStack Table + Tiptap + ApexCharts + react-hook-form + axios).

Lo que se conserva tal cual:
- Auth shell + layout/sidebar/topbar
- Theme system (light/dark, presets)
- TanStack Table (para listados de productos/orders/customers)
- ApexCharts (dashboards)
- Tiptap (rich text editor)
- react-hook-form + zod resolvers

Lo que se REEMPLAZA:
- Mock services (`/src/services` + `/src/mock`) → cliente SDK de packages/sdk
- Auth provider → JWT del backend nuestro (no Firebase)
- Rutas mockup → vistas reales: catalogo, pedidos, inventario, cms, etc.

Lo que se BORRA:
- FullCalendar, Gantt, Firebase, react-csv (no aplica al MVP)

## apps/store — Tienda

Base: `C:\Users\sotelos\FARMATOTAL\clone` (Next 16, Tailwind, pixel-perfect
ya armado).

Cambios:
- Borrar `prisma/` + SQLite + `src/app/(payload)/` (el PoC de Payload se va).
- Borrar `src/app/(site)/admin/` (lo reemplaza apps/admin).
- Reemplazar `src/lib/data.ts`, `src/lib/catalog.ts`, `src/lib/fetchers.ts`,
  `src/lib/sync/` por llamados al SDK.
- Mantener UI, providers de cart/wishlist/sucursal, checkout.

## Modelo de datos (alto nivel)

PostgreSQL 16, una sola DB. Esquema `farmatotal_app`. JSONB usado para:
- `products.custom` → vademecum, posologia, etc.
- `pages.blocks` → page builder
- `orders.events` → audit trail
- `settings.value` → settings por modulo

Multi-inventario:
- `branches(id, code, name, address, lat, lng, active)`
- `inventory(product_id, branch_id, stock, reserved, updated_at)` — PK compuesta
- `branches_pickup_rules(branch_id, ...)` — reglas de retiro
- Stock total = SUM(inventory.stock) por producto. Reserva = `reserved` por sucursal.

Sync ERP:
- Tabla `sync_runs(id, type, started_at, finished_at, status, stats jsonb)`
- Tabla `sync_errors(run_id, sku, error, ts)`
- Job BullMQ `sync.full` y `sync.delta` con backoff

## Ports locales

| App | Puerto | URL local |
|---|---:|---|
| api | 4000 | http://localhost:4000 |
| admin | 5173 | http://localhost:5173 |
| store | 3000 | http://localhost:3000 |
| postgres | 5433 | reusar 192.168.41.34 o local |
| redis | 6379 | local docker |

## Auth flow

1. `POST /auth/login` → access JWT en body (15min) + refresh en httpOnly cookie.
2. Admin (SPA): guarda access en memoria, llama `/auth/refresh` cuando 401.
3. Store (SSR): cookie viaja sola, middleware Next refresca si hace falta.
4. RBAC simple: roles `admin | editor | viewer | customer`. Permisos por
   resource + accion (CASL/AccessControl). Customers no entran al admin.

## Roadmap (6 fases, ajustado)

| F | Que | Cuando |
|---|---|---|
| 0 | Scaffold monorepo + DB schema base + auth + admin login | Semana 1 |
| 1 | Catalogo (products, categories) + admin CRUD + store lee del SDK | Semana 2-3 |
| 2 | Multi-inventario + branches + sync ERP basico (jobs) | Semana 4-5 |
| 3 | Pedidos + checkout + carrito persistente | Semana 6-7 |
| 4 | CMS pages + page builder + media + SEO | Semana 8 |
| 5 | Pagos Bancard + cupones + promos | Semana 9 |
| 6 | Cutover: dominio apunta a Next, WP queda solo de respaldo | Semana 10 |

## Decisiones pendientes (preguntar al usuario)

1. **Backend**: Fastify+Drizzle (recomendado) vs NestJS+Drizzle vs NestJS+Prisma.
2. **Tenancy**: una sola DB para Farmatotal, o multi-tenant ya pensando en
   replicar a otra farmacia.
3. **Auth**: JWT como arriba, o session-cookie de toda la vida.
4. **Tienda**: reusar `clone` o empezar Next 16 desde cero limpio.
