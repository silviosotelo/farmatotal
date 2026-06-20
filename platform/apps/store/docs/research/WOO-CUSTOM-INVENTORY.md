# Inventario de código custom — WooCommerce Farmatotal

> Relevamiento del mirror `_ftp_mirror/prod/.../wp-content/` (theme `bacola-child` + plugin `sync-erp-woocommerce1`). Sirve de **checklist de features a reimplementar** en la plataforma React/Next. Documento de referencia para [`PLATFORM-VISION.md`](./PLATFORM-VISION.md).

Stack real (de `_recon/03_plugins.txt`): Elementor + Elementor Pro (homepage), **woocommerce-multi-inventory** (8theme, sucursales/stock), flexible-checkout-fields-pro + woocommerce-checkout-field-editor-pro (campos checkout), **plugin_bancard1** (gateway Bancard PY), advanced-custom-fields + meta-box, ajax-search-for-woocommerce (FiboSearch), themehigh-multiple-addresses, ti-woocommerce-wishlist. DB prefix `btw70_`. Tema padre `bacola`/`bacola-core` **no** está en el mirror.

> ⚠️ La **homepage NO está en código**: se arma en Elementor (`btw70_postmeta._elementor_data` del `page_on_front`). Para reproducirla pixel-a-pixel hay que volcar ese JSON desde MySQL.

## 1. Endpoints / AJAX / REST custom
**AJAX (`admin-ajax.php`):**
- `ft_check_stock` (`inc/stock-validation.php:39`): valida stock de 1 producto contra API ERP. POST `product_id,quantity,nonce`. → `{message,available}`.
- `ft_retry_api_sync` (`orders-api.php:548`): reenvía pedido al ERP (cap `edit_shop_orders`).
- `sync_erp_manual_sync` / `_delete_product` / `_restore_product` / `_get_stats` (`sync-erp-woocommerce.php:143`).
- `sync_erp_test_connection` / `_clear_logs` (`class-product-sync.php:42`).

**REST `sync-erp/v1`** (`class-api.php:44`, auth header `X-API-Key`, **CORS `*`**): `/health`, `/sync/trigger|status`, `/products/sync|delete|restore|deleted|{id}`, `/orders/sync|{id}`, `/stats|/stats/detailed|/logs`, `/webhook/product-updated|product-deleted|stock-updated`, `/config`.
**REST `custom-sync/v1`** (`functions.php:2244`): `POST /reindex` → `wc_update_product_lookup_tables()`. **permission_callback comentado = ABIERTO**, lo usa el sync Node.

## 2. Lógica de pedidos (checkout → ERP)
Push en `orders-api.php` `ft_enviar_pedido_a_api($order_id)`, hooks `woocommerce_order_status_processing|_completed|payment_complete|thankyou`. Idempotente vía `_order_api_sent='yes'`.
- **Endpoint:** `POST https://api.farmatotal.com.py/farma/rws/ecommerce/save_order` (`sslverify=false`, 120s).
- **Nº ERP** = `400000 + order_id` (`ECO_PEDIDO`).
- **JSON:** `venta{ ECO_VENTA[], ECO_DETALLE[](EDET_SKU/DESC/CANT/PRECIO/PORC_DCTO/COD_PROMO), ECO_CLIENTE[](CLI_CODIGO/RAZON_SOCIAL/TIPO_DOC/NRO_DOC/TELEFONO), ECO_ENVIO[](dir/ciudad/depto/sucursal/tel/lat/long/obs) }`.
- **Mapa medio pago** (`functions.php:271`): Efectivo C.E.=1, Crédito C.E.=2, Débito C.E.=3, Crédito/Débito Online=2.
- **Mapa envío** (`:281`): Delivery=1, Pick-Up=2. **Mapa estado**: processing/pending→P, completed→C, cancelled→A.
- **Campos cliente (order meta):** `_billing_nro_doc,_billing_tipo_doc,_billing_razon_social,billing_lat,billing_long,billing_sucursal`.
- **Bypass test:** `CLI_NRO_DOC=='9661000'` no envía.
- **Reintentos:** cron `ft_reintentar_envios_fallidos` (hourly), máx 10 intentos, 30 min entre intentos, lotes de 20.
- **Admin:** meta box "Información de Sincronización API" + columna + filtro + bulk "Sincronizar con API".

**Sucursal en checkout:** select `billing_sucursal` (agrupado por ciudad, Select2) inyectado en `woocommerce_before_checkout_billing_form`; validación obligatoria en `woocommerce_checkout_process`; JS bloquea "place_order" sin sucursal y consulta stock al cambiarla (`POST .../next/ecommerce/stock`), pinta filas sin stock en rojo. Aviso corte 22:30. Validación documento CI(7)/RUC(con guión) en JS.

**Validación stock por sucursal** (`inc/stock-validation.php`, `FT_Stock_Validator`): `POST https://api.farmatotal.com.py/farma/next/ecommerce/producto/stock`, payload `{STK_SUCURSAL, STK_DETALLE[]}`, resp `{success,value:[{stk_cant_act,is_valid,has_stock,message}]}`. Hook `woocommerce_add_to_cart_validation`. Código sucursal sale de cookie `woocommerce_multi_inventory_inventory` → `get_term_meta(term,'codigo_erp')`.

## 3. Campos custom (postmeta)
**Productos:** `cod_interno` (clave ERP), `porc_dcto`, `cod_promocion`/`cod_promo`, `ind_controlado`(=S receta), `ind_destacado`(=S), `ind_ecommerce` (publicación), `woocommerce_multi_inventory_inventories_stock` (stock serializado por sucursal), `deletion_reason/date`. WC: `_stock,_stock_status,_sku`.
**Pedidos:** `billing_sucursal,_billing_nro_doc,_billing_tipo_doc,_billing_razon_social,billing_lat,billing_long,_order_api_sent,_api_process_started,_api_last_attempt,_api_attempts,_api_error,_api_success_time,_api_request_body,pos_recibir_venta,json`.
**Términos (taxonomía `inventories`=sucursales):** `codigo_erp,ciudad`.
**Attachments (slider):** `slider(=1),dias(serializado),plataforma(mobile/desktop)`.

## 4. Sucursales / multi-inventory
Sucursales = términos de taxonomía **`inventories`** (8theme). Cada término: name, description(dirección), meta `codigo_erp`+`ciudad`. Sucursal activa = cookie `woocommerce_multi_inventory_inventory`. Stock por sucursal = postmeta serializado `a:N:{i:<branch>;s:..:"<qty>"}` (`class-stock-sync.php:193`). Backend Node consumido: `sync_erp_backend_url` (default `:3001`, `X-API-Key`): `GET /api/stock/all`, `POST /api/stock/update`; cron hourly. Selector "Sucursal más cercana" = plugin multi-inventory + agile-store-locator (no en child).

## 5. Homepage (Elementor — editable por secciones)
Se arma en Elementor Pro; layout en `btw70_postmeta._elementor_data`. Carruseles alimentados por hooks `elementor_pro/query/custom_featured_products` y `elementor/query/my_custom_query` filtrando `ind_destacado=S` (`functions.php:2152`). **Único componente en código:** shortcode `[custom_slider]` (`functions.php:1951`) — lee Media con meta `slider=1` filtrada por día (`dias`) y plataforma; render Slick. → reimplementar como CMS de banners {imagen, días, plataforma, orden}. El resto de secciones requiere volcar `_elementor_data`.

## 6. Shortcodes / filters / hooks WooCommerce
- `[custom_slider]` hero.
- Precios (`woocommerce_get_price_html` prio 100, `:165`): etiquetas "Precio Web:" / "Precio Normal:" según oferta (string-replace).
- `add_art_controlado_text` (badge receta, `:151`).
- `filter_products_by_discount_and_category` (`pre_get_posts`, `?descuento=N` por `porc_dcto`).
- `filter_products_by_brand_field` (WC REST filtrable por `?cod_interno=`).
- `add_sku_to_cart_item_class` (clase `sku_<SKU>` en carrito).
- Email/admin pedidos muestran "Sucursal: <billing_sucursal>".
- `theme_mod_bacola_product_image_size`→[] (imágenes externas R2, sin resize).
- **Transients deshabilitados globalmente** (`:2219`): `pre_set_transient`→false, `pre_transient`→null. (¡ojo caché al reimplementar!)
- CRON `custom_hourly_reindex` (`:2296`) limpia huérfanos `btw70_wc_product_meta_lookup`. Permite SVG upload.

## 7. Integraciones externas
- **API ERP** `https://api.farmatotal.com.py`: `/farma/rws/ecommerce/save_order` (pedidos), `/farma/next/ecommerce/producto/stock` y `/stock` (stock). Sin auth (`sslverify=false`).
- **Backend Node sync** (`:3001`, `X-API-Key`): `/api/stock/all|update|stats`, `/api/sync/start`, `/api/products/deleted`, `/api/webhook/product-{update,delete,restore}`.
- **GA4** `G-ZZNNYB9027`, `G-8FJXEXHK5L`. **Meta Pixel** `786941389242101` (PageView+AddToCart).
- **Bancard** gateway PY (`plugin_bancard1`, no en child) para pago online.
- CDNs: BlockUI, SweetAlert2, Slick. **Cloudflare R2** para imágenes. wp-mail-smtp-pro.
- (No hay integración WhatsApp en este e-commerce.)

**Tablas custom** (`btw70_`): `sync_erp_logs`, `sync_erp_stats`, `sync_erp_product_mapping` (UNIQUE `wc_product_id`,`erp_product_code`).

## Gaps que requieren acceso a BD/server
(a) `_elementor_data` de home e internas; (b) tema padre `bacola`/`bacola-core` (overrides de templates Woo); (c) config de flexible-checkout-fields-pro (define campos reales del checkout).
