# Roadmap — WordPress + WooCommerce + Elementor en React/TypeScript

> **Visión real (usuario):** construir un WP+Woo+Elementor propio en React+TS y conectarlo al
> **clone pixel-perfect** (Next) ya hecho. NO copiar la lógica de EverShop. EverShop = **desvío archivado**.
> Fuentes: relevamiento `clone/docs/research/*` + mapeo del código existente (jun 2026).

---

## 0. Hallazgo clave: ya está ~70% hecho, pero DUPLICADO

Lo que querés ya existe repartido en dos lugares que **compiten** entre sí. El trabajo principal
**no es crear, es consolidar** a un solo motor y completar gaps.

- ✅ **`platform/apps/api`** — Fastify 5 + Drizzle + Postgres (:4000). El "WooCommerce".
- ✅ **`platform/apps/admin`** — Ecme (React+TS+Vite). El "wp-admin", con page-builder **Puck** (22 bloques) = el "Elementor".
- ✅ **`clone/`** — Next 16 + React 19 + Tailwind v4. El storefront pixel-perfect, ya renderiza bloques Puck.
- ❌ **Duplicación a matar:** el `clone/` tiene su PROPIO backend (Prisma+SQLite + Payload) y su PROPIO `/admin`, y lee de **4 fuentes** (platform API, Prisma SQLite, mocks, Payload). Eso es el caos.

---

## 1. Arquitectura definitiva (UNA sola, se acabó el zigzag)

```
 [ clone/  Next 16 ]      ← storefront pixel-perfect, SOLO consume la platform API
        │  HTTP/JSON
 [ platform/apps/api ]    ← MOTOR: Woo (catálogo/pedidos/stock) + WP (CMS/pages) + Elementor (blocks Puck)
        │  Fastify+Drizzle
 [ Postgres 41.34:5433 ]  ← única fuente de verdad
        ▲
 [ platform/apps/admin ]  ← admin Ecme (gestión + page-builder Puck)
```

- **Motor** = `platform/apps/api` (Fastify+Drizzle+PG). Único backend.
- **Admin** = `platform/apps/admin` (Ecme). Único admin.
- **Storefront** = `clone/` (Next), consumiendo SOLO la platform API.
- **Page-builder (Elementor)** = Puck. **Registro de bloques compartido** entre admin (editor) y clone (render) → `packages/shared-blocks`.
- **Se elimina:** el backend Prisma/Payload del clone, su `/admin`, sus mocks. EverShop completo.

---

## 2. Matriz: WP+Woo+Elementor ↔ estado real ↔ gap

Estado: ✅ hecho · 🟡 parcial · ⬜ pendiente

| Capability | Equivale a | Estado | Dónde / gap |
|---|---|---|---|
| Catálogo (productos, categorías, marcas, imágenes) | Woo | ✅ | api `catalog/*`, 1500 prods reales |
| **Variantes/SKU como entidad, reviews, wishlist** | Woo | ⬜ | hoy Producto=SKU plano, sin variantes/reviews |
| Pedidos (checkout, líneas, estados) | Woo | 🟡 | api `orders/*` ok; checkout/pagos a completar |
| **Multi-inventario por sucursal** | Woo custom FT | ✅ | `branches`+`inventory` (PK prod+suc), stock ERP en vivo |
| **Stock en vivo ERP** | Woo custom FT | ✅ | `services/erp-stock.ts` (passthrough + caché) |
| **Sync ERP** (maestro art_*, delta, scheduler) | FarmatotalSync | 🟡 | sólo Woo import + stock live; falta sync maestro + worker. **Bloqueado por credenciales** |
| Campos custom producto (cod_interno, receta, destacado, %dcto, precio normal/web) | Woo postmeta | 🟡 | `products.custom` JSONB + overrides; poblar reales bloqueado |
| **Bancard** | Woo plugin | 🟡 | tabla `payments` + rutas stub; falta confirm idempotente + creds |
| Cupones / promos | Woo | ✅ | api `coupons/*` + admin |
| **CMS Páginas + bloques (Elementor)** | WP+Elementor | ✅ | `pages.blocks` (Puck Data) + editor Puck 22 bloques + render en clone |
| Bloques data-bound (ProductGrid/Deals por categoría/promo) | Elementor dinámico | 🟡 | hoy placeholders; falta resolver de queries |
| Header/Footer/Menús builder, media library, SEO global, draft/preview/versionado | WP | ⬜ | sólo `pages`+`settings` |
| Banners home por día/sucursal | Woo custom FT | ✅ | `slides` + `/slides/today` + admin |
| Live search | FiboSearch | 🟡 | hay en clone EverShop; portar al platform |
| Clientes | Woo | ⬜ | **stub**: admin llama `/customers` inexistente |
| Auth/RBAC | WP roles | 🟡 | JWT+roles existen; **falta guards en mutaciones y guard de /admin** |
| Órdenes → ERP (save_order, reintentos, corte) | Woo custom FT | ⬜ | subscriber order_placed → ERP |

---

## 3. Roadmap por fases

### Fase 0 — Congelar arquitectura + matar duplicados (desbloquea todo)
- Confirmar la arquitectura de §1.
- **clone/**: unificar capa de datos → SOLO `lib/api.ts` (platform API). Borrar `lib/fetchers.ts` (SQLite), `lib/catalog.ts`/`data.ts` (mocks), Payload. Hoy `/categoria` y `/producto` leen otra BD que el home — bug crítico.
- Borrar el `/admin` y las API routes propias del clone (duplican Ecme).
- Archivar `evershop/` (queda como referencia).

### Fase 1 — Page-builder sólido (el "Elementor")
- Extraer **registro de bloques compartido** (`packages/shared-blocks`): tipos/props únicos para el editor Puck (admin) y el render (clone). Hoy están duplicados y driftean.
- **Bloques data-bound**: resolver de queries (categoría/ids/tag/promo → catálogo) para ProductGrid, HomeDeals, HomeFeatured, HomeCategories.
- Versionado de schema por tipo de bloque (migrar tipos, no páginas) — lo pide el doc.

### Fase 2 — Admin completo (Ecme)
- **Clientes**: crear módulo `/customers` en api + cablear vista.
- Sucursales: formulario alta/edición. Productos: editar campos custom + stock por sucursal + imágenes.
- **Auth real + guards**: login Ecme, `preHandler` en mutaciones, guard de rutas admin.
- Media library (upload de imágenes) — falta en todo el stack.

### Fase 3 — Comercio: checkout + pagos + ERP
- Checkout completo en el clone (campos custom: sucursal, documento, razón social, lat/long).
- **Bancard** end-to-end (confirm idempotente, creds reales).
- **Órdenes → ERP** (save_order, nº 400000+id, reintentos, corte 22:30).
- Validación de stock en vivo en add-to-cart/checkout.

### Fase 4 — Sync ERP (datos reales) — **bloqueado por credenciales**
- Rotar credenciales del server comprometido → acceso WC REST / BD WP / endpoint maestro ERP.
- Conector maestro `art_*` → producto (cod_interno, receta, destacado, precios) + delta + scheduler (BullMQ ya declarado).
- UI de protección de overrides ("sincronizado del ERP" vs "editado en web").

### Fase 5 — WP-completo + white-label
- Header/footer/menús builder, SEO global, draft/preview/versionado, blog.
- Variantes/reviews/wishlist. Plantillas de campos por rubro (electro/ferretería), theme por cliente.

---

## 4. Riesgos / bloqueos honestos
- **Credenciales ERP/WP** (server comprometido por carding) → bloquea sync maestro y campos reales. Crítico.
- **El clone tiene 4 backends** → hasta unificar (Fase 0) cualquier cosa nueva se duplica.
- **Drift de bloques** admin↔clone → resolver con el registro compartido antes de sumar bloques.

## 5. Decisión que necesito de vos
Confirmar §1 (motor = platform/apps/api, admin = Ecme, storefront = clone, EverShop archivado) y que arranco por **Fase 0 (consolidar el clone a la platform API + matar duplicados)**.
