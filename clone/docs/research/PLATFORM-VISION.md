# Plataforma Farmatotal — Visión de arquitectura

> **Qué es:** WooCommerce reimaginado en React/Next.js — storefront + admin + motor de sincronización + page builder, sobre PostgreSQL. Una sola plataforma, propia, ERP-agnóstica.
> **Qué reemplaza:** WordPress + WooCommerce + Elementor + woocommerce-multi-inventory + el sincronizador Node + wp-admin.
> **Nivel:** MVP enterprise, inspirado en VTEX (modelo de catálogo) y en el theme Nest (alcance de features y secciones).

Este es el **documento raíz**. Debajo cuelgan:
- [`BACKEND-PLAN.md`](./BACKEND-PLAN.md) — API + datos + auth + pagos + ERP del storefront.
- [`ADMIN-PLAN.md`](./ADMIN-PLAN.md) — panel de administración (`/admin`).
- [`SYNC-ENGINE.md`](./SYNC-ENGINE.md) — **el goal grande**: sincronización dinámica mapeable contra cualquier ERP.
- [`PAGE-BUILDER.md`](./PAGE-BUILDER.md) — homepage e internas editables por secciones.
- Referencias: [`WOO-CUSTOM-INVENTORY.md`](./WOO-CUSTOM-INVENTORY.md) (todo lo custom a replicar), [`NEST-FEATURE-ANALYSIS.md`](./NEST-FEATURE-ANALYSIS.md) (features/secciones), [`GAP-ANALYSIS.md`](./GAP-ANALYSIS.md).

---

## 1. Los cuatro pilares

1. **Storefront** — el clon Next.js ya **funcional** (mock); se conecta a datos reales. (→ `BACKEND-PLAN.md`)
2. **Admin** — gestión total (pedidos, clientes, catálogo, contenido, config, SEO, envíos, pagos). (→ `ADMIN-PLAN.md`)
3. **Sync Engine** — conectores + mapeo JSON↔tablas configurable desde el admin, idempotente, con dry-run. (→ `SYNC-ENGINE.md`)
4. **Page Builder** — páginas = lista ordenada de bloques tipados, editables por sección. (→ `PAGE-BUILDER.md`)

Stack único (ver `BACKEND-PLAN.md §1`): **Next.js 16 + Prisma + PostgreSQL + shadcn/ui**, todo en una app, deploy único. Dev local primero.

---

## 2. Campos custom (cross-entity) — decisión: **JSONB, no EAV**

El requisito "campos custom sí o sí en productos, categorías, sucursales y más" se resuelve con una **columna `customFields Json` por entidad** + una tabla `CustomFieldDefinition` que **gobierna el admin UI, la validación y los filtros**. No EAV (se vuelve inmantenible en meses).

```prisma
model CustomFieldDefinition {
  id         String   @id @default(cuid())
  entity     CfEntity                 // PRODUCT | CATEGORY | BRANCH | ORDER | CUSTOMER
  key        String                   // "requiresPrescription", "porcDcto"
  label      String                   // "Requiere receta"
  type       CfType                   // STRING NUMBER BOOLEAN ENUM DATE JSON
  options    Json?                    // para ENUM
  required   Boolean  @default(false)
  filterable Boolean  @default(false) // expone faceta en storefront (estilo VTEX specification)
  categoryId String?                  // si aplica solo a una categoría (specs por categoría)
  position   Int      @default(0)
  @@unique([entity, key, categoryId])
}
// En cada entidad: customFields Json @default("{}")
```

- **Por qué JSONB:** queryable e indexable en Postgres (índices GIN), soportado por Prisma, sin tablas-pivote. Filtros de catálogo (`customFields->>'brand' = 'X'`) salen directo.
- Los campos del ERP actual (`cod_interno`, `porc_dcto`, `ind_controlado`, `ind_destacado`, `cod_promocion`) se modelan como definiciones de campo custom de `PRODUCT` — el mismo mecanismo que cualquier campo nuevo que el cliente quiera agregar mañana sin tocar código.
- `codigo_erp`/`ciudad`/`lat`/`lng` de sucursales → custom fields de `BRANCH`.

---

## 3. Patrones VTEX que adoptamos (y los que NO)

**Adoptamos:**
- **Specifications por categoría** = `CustomFieldDefinition` con `categoryId` + `filterable` → facetas de filtro en el storefront.
- **Brands/Collections** como taxonomías separadas de categorías.
- **Inventory por sucursal** (ya en `BACKEND-PLAN`): tabla `Inventory (product × branch)`.

**Diferimos (anotado, no prometido):**
- **SKU/variantes como entidad** (un producto con múltiples SKUs). MVP: `Product = SKU` (como hoy). VTEX-style variants = **Fase 2**.
- **Precio por sucursal / trade policies**: posible (hay inventory por sucursal), no comprometido en MVP.
- **Multi-vendor (Dokan)**: fuera de alcance salvo pedido explícito.

No construimos VTEX. Construimos los patrones que resuelven el dolor real (campos custom, sucursales, sync mapeable) y nombramos lo diferido.

---

## 4. Features a replicar (del Woo actual + Nest)

Checklist completo en `WOO-CUSTOM-INVENTORY.md` (Woo real) y `NEST-FEATURE-ANALYSIS.md` (inspiración). Lo crítico que el storefront/admin DEBEN cubrir:

- **Stock por sucursal en tiempo real**: selector de sucursal obligatorio en checkout, validación en add-to-cart y en checkout (proxy a `api.../producto/stock`), pintado de ítems sin stock.
- **Push de pedidos al ERP**: JSON `save_order` (`ECO_*`), nº ERP `400000+id`, idempotencia, reintentos con backoff. (→ `SYNC-ENGINE.md`, flujo outbound)
- **Campos de cliente**: tipo_doc CI(7)/RUC(con guión) con validación, razón social, nro_doc, teléfono, lat/long.
- **Mapas**: medio de pago, método de envío (delivery/pickup), estado de pedido (ver inventario §2).
- **Badges/reglas**: receta médica (`ind_controlado`), corte horario 22:30, etiquetas "Precio Web/Normal".
- **Tracking**: GA4 (2 IDs) + Meta Pixel.
- **Pagos**: gateway Bancard online (greenfield, ver `BACKEND-PLAN §6`).
- **UX Nest**: wishlist, compare, quick-view, búsqueda AJAX, mega-menú, sticky add-to-cart, frequently-bought-together, sold progress bar, load-more/infinite scroll (priorizar en `ADMIN`/`PAGE-BUILDER` por fases).

---

## 5. Homepage — decisión: **migración pixel-perfect** ✅ (2026-05-25)

La home de producción vive en Elementor (`_elementor_data` en MySQL, no en código). Se eligió reproducirla **fiel al sitio actual**: volcar `_elementor_data` desde la BD y escribir un **importer** que mapea widgets Elementor → nuestros tipos de bloque (detalle en [`PAGE-BUILDER.md §5`](./PAGE-BUILDER.md)).

**Dependencia inmediata (acción time-sensitive):** capturar un **snapshot del `_elementor_data`** de la home (y de las internas) desde el MySQL de Hostinger — es lectura, pero el sitio vivo puede cambiar, conviene congelarlo ya. Credenciales de BD en el `wp-config.php` mirroreado; acceso vía SSH/WP-CLI del server.

---

## 6. Orden macro (fases)

1. **Storefront backend** (Postgres + Prisma + catálogo real). No depende de Bancard ni whitelist.
2. **Sync Engine v1** (connector `farmatotal-rest` + mapeo + dry-run). Reemplaza el sync Node.
3. **Admin MVP** (sync monitor + catálogo/overrides + pedidos + clientes + config).
4. **Auth + checkout + pagos** (Bancard sandbox → prod).
5. **Page Builder** (bloques + editor + render). Home según el fork §5.
6. **Migración Woo** (usuarios/pedidos) + hardening + tracking.

> Cada documento hijo detalla sus propias sub-fases. El trabajo es de **meses**; el MVP funcional (1–4) es de **semanas**.
