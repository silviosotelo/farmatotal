# Module: sync-erp (Farmatotal ERP ↔ WooCommerce)

> Reverse-engineered from the LIVE Hostinger child theme `bacola-child` (WP 6.9.4, WooCommerce 10.7).
> Source files captured read-only via FTP into `FARMATOTAL/_recon/theme/`:
> - `functions.php` (2517 lines) — price display, sucursales, stock-check JS, reindex REST+cron.
> - `orders-api.php` (761 lines) — **the live order → ERP push** (`ft_enviar_pedido_a_api`).
> - `inc/stock-validation.php` (327 lines) — server-side stock guard at add-to-cart / cart.
> - `js/stock-validation.js`, `js/custom-scripts.js`, `action-scheduler.php`.
>
> Theme File Editor in wp-admin is DISABLED (DISALLOW_FILE_EDIT / capability) — code was pulled by FTP.
> Loader: `functions.php:2223` → `if(!function_exists('ft_enviar_pedido_a_api')) require_once .../orders-api.php;`
> and `functions.php:72` → `require_once .../inc/stock-validation.php;`.

---

## (a) Overview — how the real sync actually works

There are **four** moving parts. Note that the theme itself does **NOT** pull the product
catalog from the ERP. Catalog writes are done by an **external Node service** (the
`FarmatotalSync` daemon on the Tigo server, see memory `farmatotal_sincronizador`); the theme
only (1) **pushes orders to the ERP**, (2) **reads live stock** from the ERP at checkout, and
(3) **re-indexes** WooCommerce's internal lookup table so WC "sees" rows the external sync wrote.

| Direction | Trigger | Endpoint | Implemented in |
|---|---|---|---|
| **Outbound order → ERP** | WC order status events | `POST .../ecommerce/save_order` | `orders-api.php` |
| **Inbound stock read** | checkout / add-to-cart (live, per request) | `POST .../ecommerce/producto/stock` (+ `.../ecommerce/stock`) | `stock-validation.php`, `functions.php` JS |
| **Inbound catalog write** | external Node daemon (NOT in theme) | writes `wp_postmeta` directly | external `FarmatotalSync` |
| **Lookup reindex** | hourly cron + REST | local DB only (no ERP) | `functions.php` `custom-sync/v1` |

ERP base host: **`https://api.farmatotal.com.py/farma/rws/...`** (prod, `rws` = this client/tenant)
and **`.../farma/next/ecommerce/...`** for the stock endpoints. Dev variants
(`api.dev.farmatotal.com.py`, `www.dev.farmatotal.com.py/api/wc-articulos-999999.php`) are
commented-out legacy.

---

## (b) ERP endpoints + payloads

### 1. Order push — `save_order`
- **URL:** `https://api.farmatotal.com.py/farma/rws/ecommerce/save_order`
- **Method:** `POST`, `Content-Type: application/json`
- **Auth:** NONE (no header/token). `sslverify => false`, `timeout => 120`, `data_format => body`.
- **Body** (`wp_json_encode($venta, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)`):

```php
$venta = array(
  'ECO_PEDIDO'     => 400000 + $numero_pedido,   // WC order id + 400000 offset
  'ECO_PEDIDO_ALF' => $numero_proceso,           // $order->get_order_key()
  'ECO_VENTA' => array(array(
     'ECO_TIPO'=>'1','ECO_MON'=>'1','ECO_FEC_PED'=>$now, // America/Asuncion, 'Y-m-d\TH:i:s\Z'
     'ECO_ESTADO'=>$estado_del_pedido,            // P/C/A (see status map)
     'ECO_MET_PAGO'=>$medio_de_pago,              // 1/2/3 (see payment map)
     'ECO_OPC_DELIVERY'=>$metodo_envio,           // 1=Delivery 2=Pick-Up
     'ECO_DESCUENTO'=>$total_descuento,'ECO_CUPON'=>$cupon,'ECO_TOTAL'=>$order_total)),
  'ECO_DETALLE' => $itemsAenviar,                 // array of line items, see below
  'ECO_CLIENTE' => array(array(
     'CLI_CODIGO'=>$cli_cogido,'CLI_RAZON_SOCIAL'=>...,'CLI_TIPO_DOC'=>...,
     'CLI_NRO_DOC'=>...,'CLI_TELEFONO'=>$telefono_cliente)),
  'ECO_ENVIO' => array(array(
     'ECO_ENV_TIPO'=>1,'ECO_ENV_DIR'=>...,'ECO_ENV_CIUDAD'=>...,'ECO_ENV_DEP'=>...,
     'ECO_ENV_SUC'=>$sucursal,                    // codigo_erp of branch (NOT term_id)
     'ECO_ENV_TEL'=>...,'ECO_LATITUD'=>...,'ECO_LONGITUD'=>...,'ECO_OBS'=>$nota_pedido)),
);
```

Line item shape (`ECO_DETALLE[]`):
```php
array('EDET_NRO_ITEM'=>$n,'EDET_SKU'=>$product->get_sku(),'EDET_DESC'=>$name,
      'EDET_CANT'=>$qty,'EDET_PRECIO'=>$line_total,
      'EDET_PORC_DCTO'=>get_post_meta($pid,'porc_dcto',true),
      'EDET_COD_PROMO'=>get_post_meta($pid,'cod_promocion',true));
```

**Success response** is JSON with a `.msg` field (`$decode->msg`). HTTP must be `200`.

### 2. Stock read — `producto/stock` (server-side guard, the authoritative one)
- **URL:** `https://api.farmatotal.com.py/farma/next/ecommerce/producto/stock`
- **Method:** `POST`, JSON, no auth, `timeout => 8`.
- **Request:**
```php
['STK_SUCURSAL'=>$erp_code,
 'STK_DETALLE'=>[['STK_NRO_ITEM'=>1,'STK_ARTICULO'=>$sku,'STK_CANTIDAD'=>$qty,
                  'STK_PORC_DCTO'=>0,'STK_COD_PROMO'=>0]]]
```
- **Response (new structure):** `{ success:bool, message, value:[ { stk_articulo, stk_cant_act,
  stk_cant_sol, has_stock, is_valid, message } ] }`. Code reads `value[0]`: `is_valid` gates
  "product not found", `has_stock` (or `stk_cant_act >= qty`) gates the add-to-cart.

### 3. Stock read — `.../ecommerce/stock` (checkout JS, multi-item, cosmetic)
- Called from inline jQuery `ConsultaStock()` in `functions.php` (~L938). **Note the URL is plain
  `http://api.farmatotal.com.py/farma/next/ecommerce/stock`** (http, not https).
- Request: `{ STK_SUCURSAL, STK_DETALLE:[{STK_NRO_ITEM,STK_ARTICULO(sku),STK_CANTIDAD,STK_PORC_DCTO:0,STK_COD_PROMO:0}] }`
- Response `{ value:[{ stk_articulo, stk_cant_act, stk_cant_sol }] }`; rows where
  `stk_cant_act < stk_cant_sol` get highlighted red and `#place_order` is disabled.

---

## (c) Inbound: ERP → producto field mapping

The **catalog write itself is external** (Node daemon writes `wp_postmeta`). The theme is the
consumer; from how it reads the meta we can reconstruct the canonical field map the platform's
sync engine must reproduce:

| ERP field (art_*) | WooCommerce storage | Used by (evidence) |
|---|---|---|
| `art_codigo` / internal code | post_meta `cod_interno` | catalog key (referenced in memory/recon) |
| SKU / barcode | WC product **SKU** (`_sku`) | order push `EDET_SKU`, stock `STK_ARTICULO` |
| controlled-drug flag | post_meta `ind_controlado` | `functions.php:162` shows "venta bajo receta" notice |
| featured flag | post_meta `ind_destacado` | featured/destacados queries |
| discount % | post_meta `porc_dcto` | order `EDET_PORC_DCTO`; product filter query L225/235 |
| promo code | post_meta `cod_promocion` | order `EDET_COD_PROMO` |
| web price (oferta) | WC **sale price** (`is_on_sale()`) shown as "Precio Web" | `precio_web`/`precio_normal` L171-200 |
| normal price | WC **regular price** shown as "Precio Normal" | same |
| **stock per branch** | **NOT stored in WP** | always read live from ERP `producto/stock` by `STK_SUCURSAL` |

**Branches (sucursales):** stored as terms of the **`inventories`** taxonomy (WooCommerce
Multi-Inventory plugin). Each term has term_meta **`codigo_erp`** and **`ciudad`**
(`functions.php:1053 obtener_sucursales`). The checkout `<select name="billing_sucursal">` uses
**`codigo_erp` as the option value** (grouped by `ciudad`). Categories are native WC product
categories (managed by Elementor/external sync — no ERP category logic lives in the theme).

---

## (d) Outbound: order → ERP full flow (`ft_enviar_pedido_a_api`)

**Triggers (4 hooks, all → same fn, all idempotent):**
```php
add_action('woocommerce_order_status_processing','ft_enviar_pedido_a_api',10,1);
add_action('woocommerce_order_status_completed','ft_enviar_pedido_a_api',10,1);
add_action('woocommerce_payment_complete','ft_enviar_pedido_a_api',10,1);
add_action('woocommerce_thankyou','ft_enviar_pedido_a_api',10,1);
```
(The OLD `wl8OrderPlacedTriggerSomething` in `functions.php:307` and its `woocommerce_thankyou`
hook are **commented out** — superseded by orders-api.php.)

**Flow:**
1. **Idempotency guard:** if `_order_api_sent == 'yes'` → return immediately.
2. Set `_api_process_started='yes'`, `_api_last_attempt=now`. Open per-order debug logs
   `DOCUMENT_ROOT/api/response_{id}.txt` and `trackerror_{id}.txt`.
3. Map customer/shipping meta (`_billing_nro_doc`→CLI_NRO_DOC, `_billing_tipo_doc`,
   `_billing_razon_social`, `billing_lat/long`→ECO_LATITUD/LONGITUD, `billing_sucursal`→ECO_ENV_SUC).
   Defaults filled if empty (NRO_DOC='0', TIPO_DOC='1', RAZON_SOCIAL=first+last name).
4. `ECO_ENV_SUC` = `obtener_codigo_erp_desde_cookie()` (cookie
   `woocommerce_multi_inventory_inventory` → term_id → term_meta `codigo_erp`), falling back to
   `billing_sucursal`.
5. Build `$venta` (shape in §b), store `_api_request_body`.
6. **Test bypass:** if `CLI_NRO_DOC == '9661000'` → skip HTTP, mark sent=yes, return.
7. `wp_remote_post(save_order)`.
8. **Result handling:**
   - `is_wp_error` → write `_api_error`, increment `_api_attempts`, order note, return false.
   - HTTP != 200 → write `_api_error` (+`pos_recibir_venta`=body), increment `_api_attempts`,
     note, return false.
   - HTTP 200 → set `_order_api_sent='yes'`, `_api_success_time`, `pos_recibir_venta`=response,
     order note `e-Commerce Sync Completada`, **`$order->update_status('completed')`**, save
     `json` meta = request body.

**Order number:** `ECO_PEDIDO = 400000 + WC_order_id` (fixed 400000 offset);
`ECO_PEDIDO_ALF = order_key`.

**Idempotency meta:** `_order_api_sent='yes'` (the single source of truth). Plus diagnostics:
`_api_process_started`, `_api_last_attempt`, `_api_attempts`, `_api_error`, `_api_success_time`,
`_api_request_body`, `pos_recibir_venta`, and `json` (last sent body).

**Retry (cron `ft_reintentar_envios_fallidos` → `ft_verificar_pedidos_pendientes`):**
- `WP_Query shop_order` where `_api_process_started='yes'` AND (`_order_api_sent` NOT EXISTS OR != 'yes')
  AND `_api_attempts < 10`, `date_query after '7 days ago'`, `posts_per_page=20`.
- Per order: skip if last attempt < **1800s (30 min)** ago; else re-call `ft_enviar_pedido_a_api`;
  `sleep(3)` every 5 orders.
- **Max 10 attempts**, only orders ≤ 7 days old, batch of 20/run.

**Admin UX in orders-api.php:** meta box "API sync" (`_order_api_sent` badge), manual "retry"
AJAX (`wp_ajax_ft_retry_api_sync`), order-list column + filter (sent/pending), and a bulk action
"sync to API".

---

## (e) Cron schedule (confirmed registered via Advanced Cron Manager)

| Hook | Schedule | Registered at | Does |
|---|---|---|---|
| `ft_reintentar_envios_fallidos` | `hourly` | `orders-api.php:352` | retry failed order pushes (see §d) |
| `custom_hourly_reindex` | `every_hour` (custom 3600s) | `functions.php:2454` | rebuild WC lookup table delta |
| ~~`job_procesar_articulos`~~ | — | legacy, **commented out / absent** | old catalog puller |

`custom_hourly_reindex` (functions.php:2464): transient lock `custom_sync_reindex_lock` (3500s);
deletes orphan rows in `wc_product_meta_lookup`; then reindexes products with
`post_modified_gmt >= now-5400s` (90 min, LIMIT 500) by invoking the **protected**
`WC_Data_Store_WP::update_lookup_table($id,'wc_product_meta_lookup')` via Reflection.

**REST reindex (`custom-sync/v1`)** — how the external sync tells WP to refresh after writing meta:
- `POST /wp-json/custom-sync/v1/reindex` body `{"ids":[..]}` → per-id reindex via Reflection;
  empty body → global `wc_update_product_lookup_tables()` (Action Scheduler async) + orphan delete.
- `GET /wp-json/custom-sync/v1/reindex-status` → counts/progress.
- **Auth:** header `X-API-Key` vs `CUSTOM_SYNC_API_KEY` (wp-config); **if the constant is unset the
  endpoint is PUBLIC** (current state = no key = open).

---

## (f) Gotchas

- **No auth on ERP endpoints.** `save_order`, `producto/stock`, `stock` accept anonymous POSTs;
  `sslverify=false` everywhere. The reindex REST is effectively public (no key defined).
- **Mixed TLS:** server-side guard uses `https://.../producto/stock`; the checkout JS uses
  **`http://.../stock`** (plain HTTP, mixed-content / MITM risk — relevant given the carding
  incident in memory).
- **term_id vs codigo_erp:** the cookie `woocommerce_multi_inventory_inventory` holds the
  **term_id**; `obtener_codigo_erp_desde_cookie()` maps it to term_meta `codigo_erp`. The ERP only
  ever wants `codigo_erp`. The checkout select stores `codigo_erp` directly into `billing_sucursal`.
  Two different representations of "branch" — do not conflate.
- **Order number offset 400000** is hard-coded; ERP expects `ECO_PEDIDO = 400000 + wc_id`.
- **Status/payment/shipping are integer/char codes**, not strings:
  estado `processing/pending→P, completed→C, cancelled→A`; medio_pago `Efectivo=1, TC=2, TD=3`;
  metodo_envio `Delivery=1, Pick-Up=2`.
- **Stock is never persisted in WP** — it is read live per request from the ERP by branch. Any
  platform must keep this real-time call (do not cache branch stock in the product table).
- **Catalog ingestion is NOT in the theme** — it's the external `FarmatotalSync` Node daemon
  writing `wp_postmeta`; the only theme-side coupling is the reindex REST/cron that refreshes
  `wc_product_meta_lookup` afterward.
- **Test doc bypass:** `CLI_NRO_DOC == '9661000'` short-circuits the push (keep an equivalent
  test hook or strip it).
- Duplicate-protection differs between old/new code: old used `_order_processed`, new uses
  `_order_api_sent` — only `_order_api_sent` is authoritative now.

---

## (g) Reimplementation task list — `platform/apps/api` module `sync-erp`

1. **ERP client** (`erpClient.ts`): typed POST helpers for
   `save_order`, `producto/stock`, (optionally `stock`). Configurable base URL
   (`api.farmatotal.com.py/farma/rws` + `/farma/next`), JSON, no auth header (parametrize for
   future), per-call timeout (order=120s, stock=8s). **Use HTTPS for all** (fix the http stock URL).
2. **Outbound order push** (`pushOrder.ts`): build the `ECO_*` envelope from a platform order;
   `ECO_PEDIDO = 400000 + orderId`; map status/payment/shipping codes; line items `EDET_*` with
   `porc_dcto`/`cod_promocion` from product custom fields. Persist idempotency flag
   (`erp_sent` bool) + diagnostics (`erp_attempts`, `erp_last_attempt`, `erp_error`,
   `erp_request_body`, `erp_response`). On 200 with `.msg` → mark sent, set order completed.
3. **Order push triggers:** fire on order paid/processing/completed (queue job, idempotent on
   `erp_sent`).
4. **Retry worker:** cron (hourly) selecting orders `erp_sent=false AND attempts<10 AND created>now-7d`,
   batch 20, skip if last attempt <30 min, backoff/sleep between calls.
5. **Live stock service** (`stockService.ts`): `producto/stock` by `STK_SUCURSAL=codigo_erp`;
   enforce at add-to-cart and checkout (server-authoritative); parse `value[0].{has_stock,is_valid,
   stk_cant_act}`. Never persist branch stock.
6. **Branch model:** branch entity with `codigo_erp`, `ciudad`, name, address; expose grouped-by-city
   selector. Keep an internal id ↔ `codigo_erp` map (mirrors term_id ↔ codigo_erp).
7. **Inbound catalog sync engine** (replaces the external Node daemon + lookup reindex): ingest ERP
   `art_*` → product fields `cod_interno`, `ind_controlado`, `ind_destacado`, `porc_dcto`,
   `cod_promocion`, regular price (Precio Normal), sale price (Precio Web), SKU/barcode, categories.
   No lookup-table reindex needed (native DB), but provide a mappable upsert + delta sync (modified
   since, batch 500) and an authenticated `reindex`/sync-status endpoint (require API key, unlike
   the current open one).
8. **Security hardening:** require auth on all ERP-facing and sync endpoints; HTTPS only; no
   `sslverify=false`; rate-limit; audit log.
