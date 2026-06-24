# Framework de plugins/módulos tipo WordPress + WooCommerce

Fecha: 2026-06-21
Estado: aprobado (alcance "framework completo") — implementación por fases vía /loop.

## Objetivo

Que **toda** capacidad de la plataforma sea un módulo/plugin granular: declarativo (manifest por plugin), activable/desactivable por tenant, configurable desde un schema, y **extensible vía hooks/eventos** (estilo `do_action` / `add_filter` de WooCommerce). Cero funcionalidad hardcodeada que no pueda apagarse o extenderse.

## Estado actual (base existente, NO rehacer)

- `apps/api/src/modules/system/registry.ts` — `MODULES: ModuleManifest[]` con `{key,name,description,kind(native|plugin),category,version,registersInto,settingsKey,adminPath,features}`.
- `apps/api/src/modules/system/modules.routes.ts` — `GET /modules`, `PATCH /modules/:key` (toggle), `GET /modules/:key/status`. Estado en `settings.modules_state = {[key]:bool}` por tenant.
- `apps/api/src/modules/plugins/plugins.routes.ts` — `GET /plugins/:key`, `PUT /plugins/:key`. Config en `settings.plugin_<key>`. **`PLUGIN_DEFS` hardcodeado** (campos por tab).
- Admin: `Modules.tsx` (grid nativos/plugins, toggle) + `PluginConfig.tsx` (render genérico de campos por grupo).
- Plugins existentes: gw_bancard, gw_personalpay, gw_tigomoney, gw_dinelco, wh_whatsapp, mk_meta, mk_google, infra_cloudflare, multi_inventory, page_builder.

## Brechas a cerrar

1. **Manifests dispersos**: `PLUGIN_DEFS` (config) vive aparte del registry. Unificar: cada plugin se auto-describe (incluye su `configSchema`).
2. **Sin sistema de hooks**: solo toggles booleanos; no hay extensibilidad por eventos.
3. **Módulos fantasma**: `wishlist` y `stock` tienen rutas pero NO están en el registry.
4. **Features nuevas hardcodeadas**: barcode/voz (FloatingButtons) y el descuento multi-inventory corren siempre, sin respetar un toggle de módulo.
5. **Gating incompleto**: el store/API no chequean `module.enabled` antes de correr varias features.

## Diseño por fases

### Fase 1 — Manifest extendido + config en el registry
Extender `ModuleManifest` con:
```ts
configSchema?: ConfigField[]   // [{key,label,type,group,placeholder,options,secret}]
dependsOn?: string[]           // keys requeridas (ej. gw_bancard dependsOn ["payments"])
enabledByDefault?: boolean
provides?: string[]            // hooks/acciones que dispara
consumes?: string[]            // hooks que escucha
```
- Mover `PLUGIN_DEFS` → `configSchema` de cada entrada del registry.
- `GET /plugins/:key` devuelve el schema desde el registry (no hardcode).
- `PluginConfig.tsx` renderiza desde ese schema (ya lo hace casi).

### Fase 2 — Sistema de hooks/eventos (API)
`apps/api/src/modules/system/hooks.ts`:
```ts
registerAction(name, fn, priority?)        // efectos
doAction(name, ctx)                        // dispara efectos (await secuencial por prioridad)
registerFilter(name, fn, priority?)        // transforma un valor
applyFilters(name, value, ctx)             // encadena transformaciones
```
- Solo corren handlers de módulos **activos** para el tenant.
- Hooks de ciclo de vida iniciales: `order.created`, `order.paid`, `checkout.totals` (filter), `stock.decrement`, `payment.confirmed`, `catalog.search` (filter).
- Refactor: el descuento de stock (multi_inventory), el ERP push y el mailer pasan a engancharse vía hooks en vez de llamadas directas hardcodeadas.
- Cada plugin expone un `init(hooks)` opcional (en su carpeta) que registra sus handlers.

### Fase 3 — Registrar todo como módulo + gating
- Alta en registry: `wishlist`, `stock` (resolver fantasmas), y **`feat_scan_search`** (barcode/voz) como plugin con config (campos a buscar SKU/EAN/barcode/codInterno, idioma de voz, formatos de barcode).
- Campo `barcode` dedicado por producto (≠ SKU): migración `products.barcode varchar(40)`, búsqueda del catálogo lo incluye, admin lo edita.
- Gating: store y API consultan el estado del módulo antes de ejecutar (FloatingButtons scan/voz solo si `feat_scan_search` on; descuento solo si `multi_inventory` on; rutas wishlist solo si on).

### Fase 4 — Activación por-tenant + dependencias en la UI
- `Modules.tsx`: agrupar por categoría, mostrar dependencias, bloquear activar si falta una dependencia, y permitir configurar inline (link a su vista).
- `GET /modules` ya es por tenant (settings.modules_state) → exponer dependencias y estado resoluble.

## Idempotencia / seguridad
- Todos los hooks de efectos (stock, ERP, mail) deben ser idempotentes (el de stock ya usa evento `stock_decremented`).
- Desactivar un módulo NO borra su config (settings persiste); solo deja de correr.
- White-label: nada de nombres de marca hardcodeados en el core.

## Orden de implementación (loop)
1. Fase 1 (manifest+config unificado) → deploy api+admin, verificar config de un plugin se sigue guardando.
2. Fase 3 parcial: barcode field + registrar fantasmas + barcode/voz como módulo + gating de scan.
3. Fase 2 (hooks) + refactor stock/erp/mailer a hooks.
4. Fase 4 (UI por-tenant + dependencias).
Cada fase: typecheck + deploy + verificación en navegador/E2E antes de la siguiente.
