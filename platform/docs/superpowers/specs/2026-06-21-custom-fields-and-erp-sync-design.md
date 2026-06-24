# Campos personalizados por entidad + Sincronizador ERP agnóstico

Fecha: 2026-06-21
Estado: aprobado (alcance ERP = "adapters + mapeo configurable"). Implementación por fases vía /loop.

## Feature 1 — Campos personalizados/configurables por entidad

Objetivo: que TODOS los campos (nativos/ERP y custom) de **productos, categorías y sucursales** sean opcionales/configurables desde el admin, igual que "Campos del checkout". Por rubro se pueden agregar campos propios (ej. "principio activo" en farmacia).

Patrón base (reusar): checkout → `settings.mod_checkout = {fields:[{key,label,type,required,width,enabled,role,options}]}`, editor `admin/views/concepts/checkout-fields/CheckoutFields.tsx` + `CheckoutFieldsService.ts`, endpoint genérico `/cms/settings/:key`.

Diseño:
- **Definiciones** por entidad en settings: `mod_product_fields`, `mod_category_fields`, `mod_branch_fields`. Mismo shape de field def + un flag `builtin?: boolean` y `path?` (a qué columna nativa mapea; si no, es custom → va a `custom` jsonb). Para builtin, el editor solo permite togglear enabled/required/label/orden (no el key/tipo).
- **Valores custom**: columna `custom jsonb` por entidad. `products` YA la tiene. FALTA agregar a `categories` y `branches` (+ `sourceId`, `sourceSystem` para trazabilidad de import). Migración ALTER TABLE.
- **Admin**: generalizar el editor de checkout en un `EntityFieldsEditor` reutilizable; 3 vistas (Campos de producto/categoría/sucursal) + rutas + nav. Los forms (ProductForm/CategoryForm/BranchForm) renderizan los campos custom y respetan enabled/required de los builtin.
- **Store**: la ficha de producto (y donde aplique categoría/sucursal) renderiza los campos custom visibles.
- **Módulo**: registrar como capacidad del framework de plugins (configurable, white-label).

Fases F1: (1) schema+migración categories/branches custom/source + DTO/input. (2) servicio admin EntityFields + 3 editores + rutas/nav. (3) forms admin renderizan custom + gating builtin. (4) store ficha producto muestra custom.

## Feature 2 — Sincronizador ERP agnóstico (plugin `erp_sync`)

Objetivo: importar/empujar/sincronizar con CUALQUIER ERP vía adapters + mapeo de campos configurable por tenant. Productos (import), pedidos (push), stock (sync).

Reusar: `services/erp.ts` (pushOrderToErp), `services/erp-stock.ts` (queryErpStock), `services/woo-importer.ts`, `scripts/import-wc-rest.ts`, tablas `syncRuns/syncErrors/syncCursors`, plugins existentes `multi_inventory` y `stock`.

Diseño:
- **Plugin** en registry: `{ key:"erp_sync", kind:"plugin", category:"infra", settingsKey:"plugin_erp_sync", adminPath:"/concepts/plugins/erp-sync", consumes:["order.created","order.paid"], configSchema:[adapter(select), baseUrl, token, rejectUnauthorized, cron?] }`.
- **Adapter interface** (`apps/api/src/modules/erp_sync/adapters/types.ts`):
  ```ts
  interface ErpAdapter {
    key: string; label: string;
    importProducts?(ctx): AsyncIterable<RawRecord>;
    importCategories?(ctx): AsyncIterable<RawRecord>;
    pushOrder?(order, lines, branch, ctx): Promise<void>;
    fetchStock?(skus, branch, ctx): Promise<Record<sku, number>>;
  }
  ```
  Adapters incluidos: `FarmatotalErpAdapter` (envuelve erp.ts/erp-stock.ts), `WooAdapter` (envuelve woo-importer). Registro de adapters por key.
- **Mapeo configurable**: tabla `erp_field_mappings (tenantId, entity, sourceName, targetName, transform?)` o, más simple, settings `plugin_erp_sync.mappings = {product:{...}, category:{...}}`. Un mapper genérico aplica el mapeo RawRecord→entidad (incluye campos custom). Idempotencia por (sourceSystem, sourceId).
- **Jobs**: `importProducts`, `importCategories`, `syncStock`, `pushOrder`. Se disparan: manual (endpoint admin), cron (config), y hooks (order.created/paid → pushOrder, vía el sistema de hooks de la Fase 2 del framework). Auditoría en `syncRuns/syncErrors`.
- **Admin**: vista del plugin (config conexión + selector de adapter + editor de mapeo + botón "Importar ahora" + historial de syncRuns/errores). Reusar PluginConfig para la config base.
- **Gating**: todo corre solo si el módulo `erp_sync` está activo (gate por tenant del framework). El push de pedidos reemplaza el `safeErpPush` hardcodeado por un handler de hook del adapter activo.

Fases F2: (1) tabla mappings + plugin registry + adapter interface + registro. (2) FarmatotalErpAdapter + WooAdapter envolviendo lo existente. (3) mapper genérico + jobs import (productos/categorías) con idempotencia + endpoint "importar ahora" + syncRuns. (4) pushOrder vía hook (reemplaza safeErpPush) + syncStock. (5) admin: config + mapeo + historial.

## Reglas
- Cada fase: typecheck + deploy al .34 (scp + rebuild ft-base + app) + verificación navegador/E2E.
- White-label: nada de "Farmatotal" hardcodeado fuera del adapter específico (que es opcional/seleccionable).
- Idempotencia en imports y push. Desactivar el módulo no borra config.
- Migraciones idempotentes (ADD COLUMN IF NOT EXISTS) aplicadas vía psql en el .34.
