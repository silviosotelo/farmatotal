# Auditoría frontend → API backend (2026-06-18)

Objetivo: que TODO el dato de negocio del storefront se consuma del backend de la plataforma
(`:4000`), sin hardcode ni fuentes paralelas. Backend con 92 endpoints documentados (`/docs`).

## 🔴 #1 — HALLAZGO CRÍTICO: doble fuente de verdad (BFF local vs backend)

Las rutas BFF del Next (`app/(site)/api/**`) **NO consumen el backend** `:4000`: leen/escriben una
**DB local propia del clon** (Prisma/SQLite vía `@/lib/db`) + Bancard directo. Solo `api/products`
(lista) y `api/search/suggest` proxyean al backend.

Rutas que pegan a la DB LOCAL en vez del backend:
- `api/orders` → debería `/orders`
- `api/auth/*` (login/register/me/logout) → `/auth/*` + `/customers`
- `api/checkout` (genera nº de orden, valida stock, aplica cupón, descuenta inventario LOCAL) → `/orders/checkout`
- `api/payments/bancard/create|confirm` + `lib/bancard.ts` (Bancard directo) → `/payments/bancard/*`
- `api/coupons/validate` → `/coupons/validate/:code`
- `api/branches` → `/branches`; `api/categories` → `/catalog/categories`
- `api/products/[slug]` → `/catalog/products/by-slug/:slug` (la LISTA sí proxea, el DETALLE no — inconsistente)
- `api/pages` + `api/site-settings` → `/cms/pages`, `/cms/settings/:key`
- `api/sync` → ingesta ERP a la SQLite del clon (raíz del doble-backend)

**Impacto:** pedidos, login/cuenta, checkout, pagos y validación de cupón quedan en un datastore
local del storefront, NO en la plataforma que administra el admin/ERP. Es lo más importante a resolver.

## 🟠 Datos de negocio hardcodeados / mock

**Módulos MUERTOS (borrar):**
- `lib/catalog.ts` — catálogo entero inventado (productos, categorías, cupones, user/orders/reviews mock). 0 imports.
- `lib/fetchers.ts` — vía paralela Prisma. 0 imports.
- `lib/blocks.ts` — registro de bloques espejo, sin uso. 0 imports.
- `lib/product.ts` — solo `slugify` se usa (sync/engine); el resto depende de fetchers (muerto).

**Features mockeadas (páginas):**
- `rastrear-pedido` → 100% mock (`activeStep=1 // mock`); debería `/orders/:id`.
- `recuperar-contrasena` → fake (solo toast).
- `mi-cuenta` "Guardar cambios" → solo toast; debería `PATCH /customers/:id`.
- `CartContext.applyCoupon` → acepta cualquier código, `percent:0`; nunca valida contra `/coupons`.
- `CheckoutBlock` → métodos de pago y envío hardcodeados; **`/shipping` y `/tax` NUNCA se llaman** → no hay desglose (total = subtotal − descuento).
- `ContactForm` → teléfono/email/dirección/horario hardcodeados + submit solo toast (no hay endpoint de contacto).
- `pedido-recibido` → lee de localStorage, no `/orders/:id` (menor).

**Defaults de negocio en `lib/api.ts` (solo fallback, aceptable pero conviene CMS):**
- `HEADER_DEFAULTS.categories` (9 fijas) → `/catalog/categories/tree`.
- `FOOTER_DEFAULTS` ("Defensores S.A. 2023" + Century) → `/cms/settings/footer_config`.
- `STORE_DEFAULTS` ("Farmatotal"…) → `/cms/settings/store_config`.

## 🟡 Temas (ekomart / anvogue) — contenido demo del template como si fuera real
(productos/categorías/deals/featured SÍ son reales por props/API; los banners/promos no)
- `AnvogueSlider` (3 slides demo), `EkomartBanner` (2 slides demo), `AnvogueHome` dual-banner, `AnvogueBrands` (6 logos template), `AnvogueInstagram` (5 posts demo), `EkomartHome` PROMO_CARDS + DiscountSection (**precio falso "Gs 15.000"**). → deberían ser banners/marcas del CMS/backend.
- `AnvogueHome` COLLECTION_IMAGES: nombres/hrefs reales, pero imagen = asset template por índice (debería `category.image`).
- Footers de tema: contacto/horarios hardcodeados.
- `AnvogueDeals`/`EkomartDeals` = código muerto (no importados por sus Home).

## 🟢 Cobertura: endpoints del backend que faltan wirear en el storefront
`GET /coupons/validate/:code`, `GET /shipping/quote|config`, `GET /tax/breakdown|config`, `GET /catalog/brands`, `GET /attributes` (filtros), `GET /orders`+`/orders/:id` (cuenta/seguimiento), `/auth/*`+`/customers` (login/registro/perfil), `/payments/bancard/*` + `/payments/methods`, `/stock/live*` (stock ERP en vivo), `/branches/:id/inventory`.

**Genuinamente client-only:** favoritos (no existe endpoint wishlist en el backend).

## ✅ Ya correcto (consume backend)
Home, catálogo, categoría, ficha de producto, buscar, carrito (UI), sucursales (`/branches`), páginas CMS, política; ProductCard/Gallery/Tabs/Actions, CategoryCircles/SuperRombo/Seleccion/PromoBanner/HeroSlider, reviews (GET+POST), variants, stock por sucursal. Temas: catálogo/ficha/carrito/checkout reciben datos reales por props.

## Plan de remediación (orden sugerido)
1. **Eliminar la doble fuente de verdad**: rewirear las BFF `api/**` para que proxyeen al backend `:4000` (orders, checkout, auth, customers, payments, coupons, branches, categories, products/[slug], pages, site-settings). Borrar/retirar la DB local Prisma del storefront.
2. Borrar módulos muertos (catalog.ts, fetchers.ts, blocks.ts; reducir product.ts).
3. Wirear cupón (validate), shipping/quote, tax/breakdown en carrito/checkout (desglose real).
4. Conectar rastrear-pedido y mi-cuenta a `/orders` y `/customers`; auth real.
5. Temas: banners/marcas/promos del CMS; quitar precio falso; borrar *Deals muertos.
6. Brands/atributos para filtros; decidir wishlist (endpoint nuevo o client-only por diseño).
