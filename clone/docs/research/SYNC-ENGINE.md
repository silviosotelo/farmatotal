# Sync Engine — sincronización ERP dinámica y mapeable

> Hijo de [`PLATFORM-VISION.md`](./PLATFORM-VISION.md). **El goal grande**: un motor que sincroniza catálogo/stock/pedidos contra **cualquier ERP**, donde el mapeo "JSON de la API ↔ tablas/campos" se **configura desde el admin**, no se hardcodea. Reemplaza el sincronizador Node actual (`FarmatotalSync`).

El sync de hoy mapea `art_* → postmeta` en código PHP/JS (ver `WOO-CUSTOM-INVENTORY.md §1-2`). Aquí ese mapeo se vuelve **dato editable**.

---

## 1. Anatomía (nombrar las partes para que deje de ser abstracto)

```
Connector → SourceSchema → Mapping (+Transforms) → Run Engine → DB / ERP
```

### 1.1 Connector
Adaptador por ERP que conoce **transporte** (HTTP REST / SOAP / DB directa), **auth** (API key, IP whitelist, basic, OAuth) y **paginación**. Interfaz común:
```ts
interface Connector {
  id: string;                       // "farmatotal-rest"
  testConnection(): Promise<boolean>;
  listEndpoints(): SourceEndpoint[];
  fetch(endpoint: string, opts): AsyncIterable<Record<string, unknown>>; // streaming + paginado
  push?(endpoint: string, payload): Promise<PushResult>;                 // outbound (pedidos)
}
```
Se entrega **uno**: `farmatotal-rest` (base `http://api.farmatotal.com.py/farma/...`, auth por IP whitelist). Agregar otro ERP = nuevo connector (o el genérico `http-json` configurable) **sin tocar el resto**.

### 1.2 SourceSchema
Declarado por connector y **editable en admin**: lista de endpoints + forma de lo que devuelven. Para Farmatotal (de `WOO-CUSTOM-INVENTORY` + proyecto sync):
- `product/list` (full) y `producto` (delta) → `{ art_codigo, art_cod_int, art_desc, art_descripcion_larga, art_precio_vta, art_precio_promo, art_ind_promo, art_porc_promo, art_cod_promo, art_stock, art_controlado, art_ind_destacado, flia_codigo, eco_estado }`
- `producto/stock` → stock por sucursal `{ STK_SUCURSAL, value:[{stk_cant_act, has_stock}] }`
- `save_order` (outbound) → `{ venta: { ECO_VENTA[], ECO_DETALLE[], ECO_CLIENTE[], ECO_ENVIO[] } }`

Se guarda como JSON; el admin puede registrar endpoints nuevos y "samplear" su respuesta.

### 1.3 Mapping
Liga **campo origen → destino** (columna del modelo o `customFields.<key>`), por tipo de entidad. Ejemplos:
- `art_codigo → Product.sku`
- `art_precio_vta → Product.priceNormal` (transform `toCents`)
- `art_controlado → Product.customFields.requiresPrescription` (transform `toBoolean('S')`)
- `flia_codigo → Product.category` (transform `lookup(categoryMap)`)

```prisma
model SyncMapping {
  id         String   @id @default(cuid())
  connectorId String
  entity     CfEntity                 // PRODUCT | CATEGORY | BRANCH | ORDER...
  businessKey String                  // campo origen que identifica unívocamente ("art_codigo")
  fields     Json                     // [{ source, target, transform, args }]
  active     Boolean  @default(true)
}
```

### 1.4 Transforms
Funciones pequeñas, nombradas y **componibles**, guardadas como JSON en el mapping:
`toBoolean('S')`, `toCents`, `trim`, `toSlug`, `lookup(table)`, `default(x)`, `concat(a,b)`, `parseDate(fmt)`, `coalesce`. Catálogo extensible; cada una `(value, args) => value`.

### 1.5 Run Engine
- **Jobs** programados: `full` (nocturno), `delta` (cada N min), `stock` (frecuente), `order-push` (outbound, on-event). `node-cron` en dev.
- **Upsert idempotente** por `businessKey` mapeado. Nunca toca columnas override del admin (ver `ADMIN-PLAN §2`).
- Cada corrida escribe `ErpSyncLog` (tipo, ok, items, mensaje). Alertas reusan patrón del sync actual.
- **Outbound (pedidos):** mismo motor en reversa — toma un `Order`, aplica el mapping `save_order`, hace `connector.push`, idempotencia por `_order_api_sent`-equivalente, reintentos con backoff (máx 10, 30 min), nº ERP `400000+id`.

---

## 2. La feature que lo hace ERP-agnóstico de verdad: **dry-run preview**

En el admin: elegir connector + endpoint → ver **JSON crudo** de muestra → arrastrar/ligar campos a destinos → **"Previsualizar 10 filas"** → ver exactamente qué se escribiría (con transforms aplicados, marcando errores de validación) **antes** de guardar el mapping. Sin esto, "configurable" es marketing; con esto, un operador integra un ERP nuevo sin programar.

Flujo admin:
1. `Connectors` → elegir/crear, test connection.
2. `Source Schema` → registrar endpoint, samplear respuesta.
3. `Mapping` → tabla origen→destino + transform por fila; `customFields` aparecen como destinos según `CustomFieldDefinition`.
4. `Dry-run` → preview N filas.
5. `Activate` + schedule.
6. `Runs` → historial (`ErpSyncLog`), disparo manual, ver diffs.

---

## 3. Migración desde el sync Node actual

El `FarmatotalSync` (Express + better-sqlite3 + node-cron) ya resuelve transporte, cola y retries. Se **porta su contrato** al connector `farmatotal-rest`:
- Catálogo: `GET product/list` / `producto` (ver proyecto `sync-erp-woocommerce-v3/src/sync/SyncService.js`).
- Stock por sucursal: hoy lo expone como `GET /api/stock/all` (mapa `branch_id→qty`); el connector lo consume o se reemplaza por la llamada ERP directa (decisión abierta en `BACKEND-PLAN §8`).
- El mapeo `art_* → modelo` que hoy está en `QueueProcessor.js` se convierte en el `SyncMapping` semilla de Farmatotal.

---

## 4. Sub-fases

1. **Engine core**: connector interface + `farmatotal-rest` + run engine + `ErpSyncLog`. Mapeo Farmatotal **semilla en código** (rápido), catálogo+stock funcionando.
2. **Mapping como dato**: tablas `SyncMapping`/`SourceSchema`, mover el mapeo semilla a DB.
3. **Admin del sync**: pantallas connectors/schema/mapping + **dry-run preview**.
4. **Outbound**: order-push con el mismo motor, retiro del PHP `orders-api.php`.
5. **Genérico**: connector `http-json` configurable (auth/paginación por formulario) → segundo ERP sin código.
