# PLAN DETALLADO POR MÓDULOS — Plataforma Farmatotal (WP+Woo+Elementor en React/TS)

> Motor = `platform/apps/api` (Fastify+Drizzle+PG) · Admin = `platform/apps/admin` (Ecme) ·
> Storefront = `clone/` (Next, pixel-perfect) · Page-builder = Puck (bloques compartidos).
> Base: `ROADMAP.md` + admin Woo real (jun 2026) + WC REST read-only desbloqueada.
> EverShop = archivado. NO copiar su lógica.

---

## A. Convenciones (todo modular)

Cada módulo es una unidad cerrada con **4 capas** y un dueño claro:

```
packages/shared/<modulo>        # tipos + contratos (DTO) + (si aplica) registro de bloques
platform/apps/api/src/modules/<modulo>/   # schema Drizzle + rutas Fastify + service + tests
platform/apps/admin/src/modules/<modulo>/ # vista Ecme + service (axios) que consume la API
clone/src/modules/<modulo>/      # consumo en storefront (lib/api + componentes)
```

Reglas:
- **Un solo contrato** por módulo en `packages/shared` (DTOs Zod) → lo usan api, admin y clone. Cero drift.
- API REST versionada `/v1/<recurso>`. Auth JWT + `preHandler` de rol en TODA mutación.
- Nada hardcodeado de "Farmatotal": campos/medidas configurables por **rubro** (white-label).
- Estados: ✅ hecho · 🟡 parcial · ⬜ pendiente. Cada módulo trae checklist.

### Fuentes de datos reales (para sembrar/migrar)
- **WC REST** (read-only, `_recon/wc-rest-new.txt`): productos con `meta_data` reales
  (`cod_interno, porc_dcto, cod_promocion, ind_controlado, ind_destacado, ind_ecommerce, fecha_sincronizacion`),
  pedidos, clientes, cupones, taxonomías (`inventories`, `marcas`).
- **ERP en vivo**: `POST api.farmatotal.com.py/farma/next/ecommerce/producto/stock` (stock por sucursal).
- ⚠️ Credenciales del server comprometido → **rotar** tras migrar.

### Modelo custom REAL (grupos ACF de Woo — verificado en wp-admin)
Los campos custom NO son postmeta sueltos: están definidos en **6 grupos ACF**.
- **Promociones** → en **Productos**: `cod_interno`(text, clave ERP), `cod_promocion`(num), `porc_dcto`(num), `ind_controlado`(text 'S'/'N' = requiere receta), `ind_ecommerce`(text = publicado), `ind_destacado`(text = featured), `fecha_sincronizacion`(text).
- **Categoria** → en **categorías**: `dpto_codigo`,`secc_codigo`,`flia_codigo`(num, jerarquía ERP depto/sección/familia), `destacado`(bool), `orden`(num).
- **Sucursales** → term_meta de la taxonomía `inventories`: `codigo_erp`(num), `telefono`(num), `ciudad`(text).
- **Pedidos** → en **órdenes**: `json`(textarea = payload/respuesta del ERP).
- **Slider** → en **attachments**: `slider`(bool), `plataforma`(checkbox), `dias`(checkbox) → slider del home por plataforma y día.
- **Usuarios** → en **users**: `razon_social`(text), `tipo_doc`(radio), `nro_doc`(text), `telefono`(num).

### Correcciones críticas del recon completo (`_recon/WP-ADMIN-FULL.md`)
- **Escala real:** 40.183 productos · 33.095 pedidos · 17.945 clientes · 1.109 categorías (prof. 2, 26 top-level) · `product_brand` **VACÍA** (no usan marcas) · 0 reviews · DB ~2,2 GB (prefix `btw70_`).
- **Sync NO es un plugin limpio:** el "Sincronizador ERP" está **inactivo**. El sync real corre por **`custom_hourly_reindex` (closure en `bacola-child/functions.php:2464`, cada 1h)** + funciones `ft_*` (ft_verificar_pedidos_pendientes, ft_reintentar_envios_fallidos) **en el tema**. Para migrar el sync hay que leer ese `functions.php`. `wp_cron=false` (cron del sistema).
- **Pedidos:** HPOS **desactivado** (CPT `shop_order` en postmeta). Nº pedido = **post ID (~90.000, 5 dígitos)**, NO 400000+. Meta: `_billing_razon_social`, `_billing_tipo_doc`(1=CI/2=RUC), `_billing_nro_doc`, `is_vat_exempt`, **`woocommerce_multi_inventory_inventory`=term_id sucursal** y **`billing_sucursal`=código ERP** (¡distinto del term_id → mapear ambos!).
- **Pagos:** sólo **Contra Entrega** activo (Efectivo/Débito/Crédito al recibir). **Bancard vPOS y Zimple INACTIVOS** → hoy no hay pago online; Bancard se integra de cero.
- **Envíos:** 1 zona Paraguay. `flat_rate` Delivery = **Gs. 12.000 fijo** · `local_pickup` Retiro = **gratis**.
- **Impuestos:** NINGUNO (`/taxes`=[], `tax_based_on=shipping`) → **IVA no se calcula, precio = final**. PYG, 0 decimales.
- **Multi-inventario:** taxonomía `inventories` = **66 sucursales** (term IDs 1692-1778), `codigo_erp` = term_meta, stock por sucursal en postmeta `..._inventory_<termId>`. Tabs Click&Collect + Flujo de Pedidos. Popup = selector de sucursal.
- **Store Locator (Agile):** **51 tiendas** con lat/lng — **fuente DISTINTA** de las 66 sucursales → reconciliar.
- **Catálogo:** `cod_interno` **≠ sku** (sku = EAN). Sin atributos globales. Elementor casi sin uso (4 templates) → migración de bloques chica.
- **Seguridad:** 2FA en 0 usuarios. Email stock: marketing@defensoressa.com.py.

---

## B. Índice de módulos

| # | Módulo | Estado | Depende de | Plugin Woo que reemplaza |
|---|--------|--------|-----------|--------------------------|
| 1 | auth-rbac | 🟡 | — | WP users/roles |
| 2 | catalogo | 🟡 | auth | WooCommerce + ACF Producto(postmeta) |
| 3 | inventario-sucursales | 🟡 | catalogo | WC Multi E Inventario + Agile Store Locator |
| 4 | pedidos-checkout | 🟡 | catalogo, inventario, clientes | WooCommerce + Checkout Field Editor + Multiple Shipping Addresses |
| 5 | clientes | ⬜ | auth | WC customers + Social Login |
| 6 | cupones-promos | ✅/🟡 | catalogo | WooCommerce + ACF Promociones |
| 7 | pagos-bancard | 🟡 | pedidos | WC Custom Payment Gateway Pro |
| 8 | cms-paginas | 🟡 | page-builder | WordPress páginas |
| 9 | page-builder | 🟡 | shared-blocks | Elementor + Bacola Core |
| 10 | media-library | ⬜ | — | Media Cloud + Image Optimizer |
| 11 | banners-slides | ✅ | catalogo | ACF Slider (home por día/sucursal) |
| 12 | search | 🟡 | catalogo | FiboSearch + Barcode/Voice |
| 13 | sync-erp | 🟡 | catalogo, inventario | FarmatotalSync + cron |
| 14 | settings | 🟡 | — | WP options |
| 15 | seo | ⬜ | cms, catalogo | Rank Math SEO |
| 16 | white-label-rubros | ⬜ | catalogo, settings | (nuevo) |

---

## 1. auth-rbac
- **Responsabilidad:** login admin, sesión JWT (access+refresh), roles `admin|editor|viewer|customer`, guards.
- **Datos:** `users(id,email,password_hash argon2,role,name,active)`, `refresh_tokens`. (Ya existen.)
- **API:** `/auth/login|refresh|logout|register|me`. (Existen.) **Falta:** `preHandler` de rol en mutaciones + middleware de guard.
- **Admin Ecme:** login real contra la API (hoy entra con sesión mock/inyectada → reemplazar). Guard de rutas `/admin`.
- **Tareas:** [⬜] guards por rol en todas las rutas mutadoras · [⬜] login Ecme→API real · [⬜] guard router admin · [⬜] expirar/rotar refresh.

## 2. catalogo
- **Responsabilidad:** productos, categorías (árbol familias), marcas, imágenes, campos custom.
- **Datos:** `products` (sku, name, slug, price, sale_price, stock_cached, status, **custom JSONB**, `titleOverride/descriptionOverride/slugOverride`, source_system/source_id), `categories` (árbol, parent_id), `brands`, `product_images`. **Campos custom reales** (en `custom` JSONB o columnas): `cod_interno` (UNIQUE, clave upsert ERP), `ind_controlado`('S'/'N'→requiere receta), `ind_destacado`(featured), `porc_dcto`, `cod_promocion`, `ind_ecommerce`(publicado), `precio_normal/precio_web`, `fecha_sincronizacion`.
- **Falta modelar:** variantes (hoy Producto=SKU plano), reviews, compare, wishlist (módulos aparte).
- **API:** `/catalog/products` (CRUD+filtros: categoría, marca, ?descuento, controlado), `/catalog/categories`, `/catalog/brands`. (Productos/categorías existen.)
- **Admin Ecme:** listado (✅) + form alta/edición con TODOS los campos custom + imágenes + stock por sucursal + flag receta/destacado.
- **Clone:** páginas catálogo/categoría/producto desde `lib/api` (hoy categoría/producto leen otra BD → **unificar**). Badge "Requiere receta" si `ind_controlado='S'`; precio normal tachado + %dcto.
- **Migración real:** bajar todos por WC REST con `meta_data` → poblar `custom` + precios reales.
- **Tareas:** [⬜] columnas/JSONB de campos custom · [⬜] importer WC REST con meta_data (reemplaza Store API recortada) · [🟡] form admin completo · [⬜] marcas + árbol familias `flia_codigo` · [⬜] unificar lectura del clone.

## 3. inventario-sucursales
- **Responsabilidad:** sucursales (66) + stock por (producto×sucursal) + selección de sucursal + stock ERP en vivo.
- **Datos:** `branches` (id, name, **erp_code**=codigo_erp, city, address, lat, lng, pickup/delivery, status), `inventory` (PK producto+sucursal, qty, source-of-truth; `products.stock_cached` cache). (Existen, 51 suc → completar a 66.)
- **API:** `/branches` (CRUD), `/inventory` (PUT set, GET by product), `/stock/*` (ERP live passthrough). (Existen.) **Falta:** alta/edición de sucursal en admin; sembrar 66 con geo+erp_code reales (taxonomía `inventories` por WC REST).
- **Clone:** modal "elegí tu sucursal" (obligatorio), sucursal activa = estado de cliente (cookie/localStorage). Stock mostrado por sucursal; validación en add-to-cart/checkout contra ERP en vivo.
- **Tareas:** [⬜] importar 66 sucursales reales (taxonomía `inventories` + term_meta codigo_erp/ciudad) · [⬜] form sucursal admin · [🟡] sync stock ERP→`inventory` (scheduler) · [⬜] validador de stock en checkout · [⬜] página `/sucursales` con mapa (react-simple-maps).

## 4. pedidos-checkout
- **Responsabilidad:** carrito, checkout, órdenes, líneas, estados, campos custom de checkout.
- **Datos:** `orders` (number=400000+id, status, payment_status, totales, branch, **billing_sucursal, nro_doc, tipo_doc, razon_social, lat/long**), `order_lines`. (Base existe.)
- **API:** `/orders/checkout`, list, `:id`, `:id/status`. (Existen.) **Falta:** campos custom de checkout (Checkout Field Editor), retiro en sucursal vs envío, validación stock.
- **Admin Ecme:** listado + detalle + cambio de estado (✅). Agregar filtros, exportar.
- **Clone:** carrito + caja con campos custom; nº pedido 400000+id.
- **Tareas:** [⬜] campos checkout custom · [⬜] retiro/envío · [⬜] validación stock en vivo · [⬜] emails de pedido.

## 5. clientes
- **Responsabilidad:** clientes, direcciones (Address Book), login social.
- **Datos:** `customers` (id, email, name, phone, doc), `customer_addresses`. **No existe** → crear.
- **API:** `/customers` CRUD + direcciones. **El admin Ecme ya llama `/customers` (ruta muerta)** → implementar.
- **Migración:** clientes por WC REST `/wc/v3/customers`.
- **Tareas:** [⬜] schema + módulo api · [⬜] cablear vista admin · [⬜] direcciones múltiples · [⬜] login social (fase 2).

## 6. cupones-promos
- **Responsabilidad:** cupones + lógica de promo (precio normal/web, %dcto, `?descuento=N`, "Super Rombo").
- **Datos:** `coupons` (✅). Promo a nivel producto: `porc_dcto`, `cod_promocion`, precio_web (en catalogo).
- **API:** `/coupons` CRUD + validate (✅).
- **Clone:** filtro `?descuento=`, página `/ofertas`, sección "Super Rombo" (carrusel+countdown) como **bloque** (ver page-builder).
- **Tareas:** [✅] cupones · [⬜] filtro descuento · [⬜] /ofertas · [🟡] Super Rombo bloque.

## 7. pagos-bancard
- **Plugins Woo reales (corrección):** Bancard NO es "Custom Payment Gateway Pro". Bancard tiene su propio plugin: **"Bancard vPOS"** (`plugin_bancard1/bancard_pagos.php`, API vPOS) + **"Bancard Billetera Zimple"** (`plugin_zimple…/zimple.php`). Hoy **inactivos**; los métodos activos son Efectivo/Tarjeta Débito/Tarjeta Crédito **Contra Entrega** (vía `woocommerce-custom-payment-gateway-pro`).
- **Responsabilidad:** pasarela **Bancard vPOS** (single_buy, confirm webhook, return) + **Zimple** (billetera) + métodos **Contra Entrega** (offline).
- **Datos:** `payments` (stub). **API:** rutas Bancard stub.
- **Reaprovechar:** el flujo vPOS ya lo implementé en `evershop/extensions/commerce/src/lib/bancard.js` (single_buy/confirm/rollback/tokens md5) — coincide con "Bancard vPOS" → **portar** al platform.
- **Tareas:** [⬜] portar lib Bancard vPOS · [⬜] gateway Zimple · [⬜] métodos Contra Entrega (efectivo/débito/crédito) · [⬜] confirm idempotente · [⬜] claves reales (settings).

## 8. cms-paginas
- **Responsabilidad:** páginas de contenido (WP), cada una = lista de bloques.
- **Datos:** `pages` (slug, title, **blocks JSONB**=Puck Data, status draft/published, seo), `settings` (key/JSONB). (Existen.)
- **API:** `/cms/pages` CRUD + by-slug, `/cms/settings/:key`. (Existen.)
- **Admin Ecme:** lista de páginas + editor (page-builder). **Falta:** draft/preview/versionado.
- **Clone:** `/paginas/[slug]` y home renderizan `blocks` (✅, `PuckRender`).
- **Tareas:** [🟡] draft/preview · [⬜] versionado · [⬜] header/footer/menús como páginas/zonas.

## 9. page-builder (el "Elementor")
- **Responsabilidad:** definición de bloques tipados, editor visual (admin) y render (clone), compartiendo UN registro.
- **Modelo:** página = `blocks` JSONB (Puck `Data {content, root, zones}`); bloque = `{id,type,props}`, props **versionadas por tipo**.
- **Bloques v1 (~12, ya hay ~22 en admin):** HeroSlider, CategoryGrid, ProductCarousel, ProductGrid, ProductTabs, ProductDeals(countdown), Banner, RichText, Features, FAQ, CTA, Testimonials, BranchMap.
- **Problema actual:** `admin/components/puck/puckConfig.tsx` (editor) y `clone/components/cms/PuckRender.tsx` (render) están duplicados y driftean.
- **Tareas:** [⬜] **`packages/shared-blocks`**: tipos+props+default de cada bloque, importado por admin y clone · [⬜] resolver de queries para bloques data-bound (ProductGrid/Deals/Featured/Categories → catálogo) · [⬜] versionado/migración de schema por tipo · [⬜] preview en vivo.

## 10. media-library
- **Responsabilidad:** subir/gestionar imágenes (productos, banners, páginas). **No existe** (hoy sólo URLs).
- **Tareas:** [⬜] storage (local/S3/Media-Cloud-like) · [⬜] endpoint upload + listado · [⬜] picker en admin (productos/slides/bloques).

## 11. banners-slides
- **Responsabilidad:** banners del home, por **día de semana** y/o sucursal.
- **Datos:** `slides` (imagen, link, weekday, orden, activo) (✅). **API:** `/slides` CRUD + `/slides/today` (✅). **Admin:** CRUD (✅).
- **Tareas:** [✅] base · [⬜] segmentación por sucursal/plataforma (como el Slider ACF real) · [⬜] bloque HeroSlider consume `/slides/today`.

## 12. search
- **Responsabilidad:** búsqueda instantánea (autocomplete) + por código de barras/voz.
- **Estado:** autocomplete hecho en evershop → **portar** al platform (`/catalog/search`) y al clone (dropdown).
- **Tareas:** [⬜] endpoint search en api · [⬜] dropdown en header del clone · [⬜] barcode/voz (fase 2) · [⬜] búsqueda por `cod_interno`.

## 13. sync-erp (DOCUMENTADO → `docs/modules/sync-erp.md`; fuente real en `_recon/theme/`)
**Flujo real (3 piezas, NO un plugin):**
- **Ingesta de catálogo = daemon Node externo `FarmatotalSync`** (server Tigo) que escribe `wp_postmeta` directo (cod_interno, ind_controlado, ind_destacado, porc_dcto, cod_promocion; precio web→sale, normal→regular). El tema **solo reindexa** `wc_product_meta_lookup` (`custom_hourly_reindex` cada 1h + REST `custom-sync/v1/reindex`, hoy **abierta sin auth**). → **Para migrar la ingesta: pull por WC REST** (ya trae esos campos sincronizados) o portar el daemon.
- **Stock en vivo (nunca se persiste):** `POST api.farmatotal.com.py/farma/next/ecommerce/producto/stock` (server) y `.../ecommerce/stock` (checkout JS, ⚠️ **http** mixed-content). Body `{STK_SUCURSAL:codigo_erp, STK_DETALLE:[{STK_ARTICULO:sku,STK_CANTIDAD}]}` → `value[0].{has_stock,is_valid,stk_cant_act}`.
- **Salida pedido→ERP** (`orders-api.php` `ft_enviar_pedido_a_api`): hooks `processing/completed/payment_complete/thankyou` → `POST .../farma/rws/ecommerce/save_order` (**sin auth, sslverify=false, 120s**). Envelope `ECO_PEDIDO=400000+wc_id` (el nº ERP SÍ es 400000+id), `ECO_VENTA/ECO_DETALLE(EDET_SKU/CANT/PRECIO/PORC_DCTO/COD_PROMO)/ECO_CLIENTE/ECO_ENVIO(ECO_ENV_SUC=codigo_erp)`. Códigos: estado P/C/A, pago Efectivo=1/TC=2/TD=3, envío Delivery=1/PickUp=2. Idempotencia `_order_api_sent='yes'`. Retry `ft_reintentar_envios_fallidos` (hora, `_api_attempts<10`, ≤7 días, batch 20, gap 30 min).
- **Gotcha:** cookie `woocommerce_multi_inventory_inventory`=term_id; `obtener_codigo_erp_desde_cookie()` lo mapea a `codigo_erp`.
- **Tareas (platform/apps/api):** [🟡] pull catálogo WC REST→upsert por `cod_interno` (mapea art_*) · [⬜] proxy stock en vivo (`/stock/validate`) · [⬜] push pedido `save_order` (400000+id, envelope ECO_*, **con auth/cert propios**) · [⬜] retry cron (10×/30min/7d) · [⬜] reindex/scheduler · [⬜] **endurecer**: hoy ERP es sin auth + sslverify=false + reindex abierto (riesgo, server comprometido).

## 14. settings
- **Responsabilidad:** config global (key/JSONB): Bancard keys, ERP, multi-sucursal on/off, skin/tema, home config, SEO global, rubro.
- **Datos:** `settings` (✅). **API:** `/cms/settings/:key` (✅).
- **Tareas:** [🟡] vista Configuración Ecme por secciones · [⬜] claves Bancard/ERP · [⬜] flags white-label.

## 15. seo
- **Responsabilidad:** meta title/desc/og por producto/categoría/página, sitemap, schema.org. (Rank Math en Woo.)
- **Tareas:** [⬜] campos SEO en pages/products · [⬜] sitemap dinámico · [⬜] JSON-LD producto/breadcrumb.

## 16. white-label-rubros
- **Responsabilidad:** plataforma multi-rubro (farmacia/retail/electro/ferretería).
- **Tareas:** [⬜] plantillas de campos custom por rubro · [⬜] skin/tema por cliente · [⬜] catálogo de bloques por rubro.

---

## C. Fases (orden de ejecución)
- **F0 Consolidar:** unificar clone→platform API, borrar backend/admin duplicados del clone, archivar evershop, crear `packages/shared`.
- **F1 Page-builder sólido:** shared-blocks + bloques data-bound (módulo 9). Es el corazón "Elementor".
- **F2 Catálogo real + sync WC REST:** módulos 2,13 (poblar campos reales) + 12 search.
- **F3 Admin completo:** módulos 1 (auth real),5 (clientes),3 (sucursales form),10 (media).
- **F4 Comercio:** módulos 4 (checkout custom),7 (Bancard),13 (push órdenes ERP).
- **F5 WP-completo + white-label:** 8 (draft/preview/header-footer),15 (SEO),16 (rubros), variantes/reviews/wishlist.

## D. Riesgos
- Drift de bloques (resolver con shared-blocks ANTES de sumar bloques).
- Credenciales comprometidas → rotar; toda integración con claves nuevas.
- Clone con 4 backends → no construir nada nuevo ahí hasta F0.
