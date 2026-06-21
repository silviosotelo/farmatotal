# Diseño — White-label + Multitenant

Fecha: 2026-06-20. Sub-proyecto previo al loop de widgets del motor.

## Decisiones (definidas con el usuario)
- **Scope npm**: `@ft/*` → `@platform/*` (directorios `packages/*` NO cambian; solo el scope).
- **Aislamiento**: una sola DB/schema + columna `tenant_id` por fila (row-level).
- **Resolución de tenant**: por dominio/subdominio (Host); fallback header `x-tenant` y env para dev.
- **Alcance v1**: todo el core — `tenants` + `tenant_id` en catálogo (products/categories/brands), CMS (pages), settings, y orders + resolución + scoping en toda la API + seed del tenant actual.
- **Sin marca**: eliminar referencias "farmatotal" del código (defaults, theme key, schema PG).

## Chunks

### 1. Rename `@ft/*` → `@platform/*` (mecánico)
- `package.json` name: ui/engine/shared-types/admin/store/api.
- Reemplazo `@ft/` → `@platform/` en imports (.ts/.tsx) y configs (tsconfig paths, vite alias, next transpilePackages).
- `pnpm install` (relink). Typecheck admin+store+engine.

### 2. De-hardcode "farmatotal"
- Schema PG: `pgSchema("farmatotal_app")` → `pgSchema("app")`, export `farmatotalApp` → `appSchema`; `ALTER SCHEMA farmatotal_app RENAME TO app` (migración). Actualizar imports en `db/schema/*`.
- Defaults genéricos: `brandName` "Farmatotal" → "Mi Tienda" (o vacío, tenant-driven); theme key default `"farmatotal"` → `"base"` (registry/getActiveTheme). Renombrar carpeta/registro del tema default a `base`.
- Otros literales "farmatotal" en código → genéricos o tomados de la config del tenant.

### 3. Multitenant — modelo de datos
- Tabla `tenants`: `id` uuid, `slug`, `name`, `domain` (unique), `active`, `created_at`. (Opcional: `theme`, settings propios viven en `settings` con tenant_id.)
- `tenant_id` (uuid, FK tenants, indexado) en: products, categories, brands, pages, settings, orders (y tablas hijas que se filtran por join: product_images via product, order_items via order).
- Unicidad: las claves únicas pasan a ser por-tenant (p.ej. `pages.slug` unique → unique (tenant_id, slug); products.sku, categories.slug, etc.).
- Migración: crear `tenants`, insertar tenant default (slug "default", domain actual), backfill `tenant_id` de todas las filas existentes al default, luego `NOT NULL` + índices/uniques.

### 4. Multitenant — resolución y scoping (API)
- Plugin Fastify `tenantResolver`: resuelve `tenant_id` por `Host` (match `tenants.domain`), o header `x-tenant` (slug), o env `DEFAULT_TENANT` en dev → `req.tenant`. 404/looser fallback en dev al tenant default.
- Helper de scoping: todas las queries del catálogo/cms/settings/orders filtran `eq(table.tenantId, req.tenant.id)` y los insert setean tenant_id. Revisar cada handler en catalog/cms/orders/settings routes.

### 5. Multitenant — store y admin
- Store (Next): resolver tenant por Host (middleware/proxy o en `lib/api` mandando header `x-tenant`). `getStoreConfig/getPage/listProducts/...` ya pegan a la API; agregar el header de tenant (derivado del Host de la request entrante).
- Admin: opera sobre un tenant seleccionado (selector de tenant para superadmin; o tenant fijo por login). v1: header `x-tenant` configurable (env/selector simple).

### Validación
- Typecheck api+admin+store+engine. Seed default tenant. E2E: dos tenants con catálogos/pages distintos resuelven por host/header distinto; el store de cada uno muestra solo sus datos. Reusar harness :3000.

## Riesgos
- Renombrar schema PG en DB viva (ALTER SCHEMA) — hacer con cuidado, backup. 
- Olvidar el filtro tenant_id en alguna query = fuga de datos entre tenants → centralizar en helpers y revisar handler por handler.
- El store corre `next start` → rebuild tras cambios.
