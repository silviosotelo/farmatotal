# Auditoría de Duplicados y Dead Code

**Fecha:** 26 de junio de 2026

## Duplicados Corregidos

### Funciones consolidadas en `packages/ui/src/utils/`
| Función | Copias antes | Archivo central |
|---|---|---|
| `gs()` (Guaraní formatter) | 5 copias | `utils/format.ts` |
| `slug()`/`slugify()` | 6 copias | `utils/slug.ts` |
| `notify()` (toast helper) | 2 copias | `utils/notify.ts` |
| `CountryOption` type | 4 copias | `shared/CountrySelect.tsx` |
| `CustomSelectOption/CustomControl` | 4 copias | `shared/CountrySelect.tsx` |

### Configs eliminados
- 3 navigation configs muertos: auth, dashboards, others

### Admin: Dead code eliminado
- `lib/bancard.ts` (120 líneas) — keys expuestas
- 8 env vars legacy (BANCARD_*)
- 1 dead service function (`apiGetErpAdapters`)

### Store: Dead code pendiente de eliminar
| Archivo | Razón |
|---|---|
| `lib/auth.ts` | Prisma session management (reemplazado por backend) |
| `lib/db.ts` | Prisma client (solo usado por sync dead code) |
| `lib/product.ts` | Prisma product helpers |
| `lib/sync/engine.ts` | Old sync engine |
| `lib/sync/connectors/*` | Old sync connectors |
| `lib/data.ts` | Deprecated `formatGs` wrapper |
| `lib/format.ts` | Another deprecated `formatGs` wrapper |
| `components/BaseHome.tsx` | Old home component |
| `commerce/StoreHeader.tsx` | Reemplazado por sections/Header |
| `commerce/StoreFooter.tsx` | Reemplazado por sections/Footer |
| `commerce/CartPage.tsx` | Reemplazado por CMS CartBlock |
| `commerce/CheckoutPage.tsx` | Reemplazado por CMS CheckoutBlock |
| `admin/SyncPanel.tsx` | Old sync UI |
| `api/sync/route.ts` | Old sync API endpoint |

## Duplicados funcionales corregidos

| Duplicación | Antes | Después |
|---|---|---|
| Plugins vs Módulos | 2 vistas separadas | 1 sola vista (Módulos) con link a config |
| Payments gateways | Inline config + Plugin separados | Plugin = autoridad, Payments = solo lectura |
| Settings currency/locale | Duplicados en Settings y StoreConfig | Solo StoreConfig |
| CMS home vs Slides | 2 fuentes para homepage | ChaiRender + SlidesCarousel block |

## CSS duplicados eliminados
35 archivos CSS en `apps/admin/src/assets/styles/components/` eliminados (idénticos a `packages/ui/src/styles/`). Reemplazados por import de `@platform/ui/styles`.
