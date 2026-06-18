# Project Status — Farmatotal Platform

## ✅ FASE 0 — Scaffold

- [x] Monorepo pnpm + turborepo (`apps/{api,admin,store}` + `packages/{shared-types}`)
- [x] tsconfig.base, .npmrc (`strict-ssl=false` por MITM corp)
- [x] docker-compose.yml con postgres+redis+minio (opcional, reusamos 34:5433)
- [x] Auth JWT access + refresh httpOnly cookie
- [x] Health endpoints (/health, /health/db)
- [x] Bootstrap admin probado: `informatica@santaclara.com.py` creado

## ✅ FASE 1 — Catálogo

- [x] Schema Drizzle: users, refresh_tokens, categories, brands, products,
      product_images, branches, inventory, sync_runs, sync_errors,
      sync_cursors (esquema `farmatotal_app`, 11 tablas)
- [x] Migración generada + push al Postgres del 34
- [x] Endpoints REST: GET/POST/PATCH/DELETE products + categories + brands
      con filtros, paginación, búsqueda, sort
- [x] Endpoint `/catalog/products/by-slug/:slug` para el store
- [x] Swagger UI en /docs

## ✅ IMPORTER — WooCommerce → backend

- [x] Cliente WC Store API (sin auth, abierto)
- [x] Idempotente vía (source_system, source_id)
- [x] Categorías: 1025 importadas
- [x] **Productos: 1500 importados (2 errores)** del catálogo real de farmatotal.com.py
- [x] Stats persistidas en `sync_runs`
- [x] CLI runner: `pnpm exec tsx src/scripts/import-woo.ts [MAX]`
- [ ] Gotcha: solo 67/1500 imágenes importadas (la mayoría no devuelve imgs
      en el endpoint /products listing). Pendiente: fetchear /products/:id
      para sacar imágenes completas, o consultar el endpoint Woo legacy
      `/wp-json/wc/v3/products/:id` con CK/CS.

## ✅ FASE 5 admin — Ecme conectado

- [x] Copiado de RWS-CRM/demo a `apps/admin`
- [x] Renombrado a `@ft/admin`, workspace de pnpm
- [x] AxiosBase: `withCredentials: true`, JWT del localStorage (Ecme nativo)
- [x] `app.config.ts`: apiPrefix → `http://localhost:4000`, enableMock=false
- [x] `endpoint.config.ts`: `/auth/login` `/auth/logout` `/auth/bootstrap`
- [x] `AuthService.ts`: adapter `{accessToken,user}` → shape Ecme
- [x] `ProductService.ts`: adapter `/catalog/products` → shape Ecme
- [x] Login + listing **funcionando** (verificado por CORS con curl)

## ✅ FASE 6 store — Clone consume backend

- [x] `clone/src/lib/api.ts` cliente backend con SSR cache
- [x] `clone/src/app/(site)/catalogo/page.tsx` patcheado a `listProducts()`
- [x] `NEXT_PUBLIC_API_URL` en `.env`
- [x] **Verificado**: `/catalogo` muestra "Catálogo (1.500)" con HTML 200

## URLs activas

| App | Puerto | URL |
|---|---:|---|
| api | 4000 | http://localhost:4000 — docs en /docs |
| admin | 5173 | http://localhost:5173 |
| store | 3000 | http://localhost:3000 (Next 16) |

## Credenciales

- Admin Farmatotal: credenciales fuera del repo (ver `.env` / gestor de secretos).
- Postgres: host/usuario/clave en `.env` (no versionado).
- Datos en esquema `farmatotal_app` (no toca `public`)

## Próximas fases (no requeridas por el goal)

### F2 — Multi-inventario + sucursales
- Schema branches + inventory ya creado, faltan endpoints CRUD
- Necesita scrapear sucursales de Farmatotal o cargar manual
- Job BullMQ para sync stock desde ERP (ver `farmatotal_sincronizador`)

### F3 — Pedidos + checkout
- Tablas orders, order_lines, order_events
- Máquina de estado (pending→paid→fulfilled→delivered)
- Endpoint /orders + integración con carrito del store

### F4 — CMS (pages + page builder)
- Tabla pages con blocks JSONB (hero, richText, productGrid)
- Endpoint /cms/pages + admin view en Ecme

### F5 — Pagos Bancard + cupones
- Tabla payments, webhook handler
- Integración con `clone/src/lib/bancard.ts`

### F6 — Cutover
- DNS farmatotal.com.py → store nuevo
- WP queda en `legacy.farmatotal.com.py` por 30 días
- Importar resto de productos (40,176 total)

## Cómo extender el importer a 40k productos

```powershell
cd platform\apps\api
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
pnpm exec tsx src/scripts/import-woo.ts 40500
```

El job es idempotente (UPSERT por `(sourceSystem, sourceId)`), corre de
nuevo sin duplicar.

## Cómo conectar más rutas del store al backend

Mismo patrón que `/catalogo`:

```tsx
import { listProducts, getProductBySlug, listCategories } from "@/lib/api";

// Ejemplo /producto/[slug]/page.tsx:
const product = await getProductBySlug(slug);
```

Falta: `/producto/[slug]`, `/categoria/[slug]`, homepage destacados,
`/buscar`. Toma 10min cada uno, mismo patrón.

## Notas

- npm/pnpm tienen `strict-ssl=false` por MITM corp ([[dev_node_npm_ssl_cert]]).
- Node fetch necesita `NODE_TLS_REJECT_UNAUTHORIZED=0` solo cuando habla
  con HTTPS externos detrás del proxy (caso del importer Woo).
