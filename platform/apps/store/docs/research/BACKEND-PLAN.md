# Backend propio Farmatotal — Plan de arquitectura

> 📐 Documento raíz: [`PLATFORM-VISION.md`](./PLATFORM-VISION.md). Este cubre el **pilar Storefront** (API + datos + auth + pagos + ERP).
>
> Objetivo (del `/goal`): backend propio que **reemplaza WooCommerce**, no lo envuelve.
> Stack: **API + PostgreSQL + auth + pagos (Bancard) + integración ERP**.
> Frontend: clon Next.js 16 ya **funcional** (mock de cliente) — este plan lo conecta a datos reales.

Decisiones confirmadas con el cliente (2026-05-25):
- **Entorno**: desarrollo **local** primero; hosting (Tigo / Hostinger / VPS) se decide después.
- **Estrategia**: **reemplazar** Woo → hay que **migrar** usuarios, pedidos e historial desde la BD MySQL de WooCommerce.

> 🔧 El **panel de administración** (gestión de pedidos, clientes, catálogo, contenido, SEO, envíos, pagos, etc. — el reemplazo de wp-admin) se especifica en su propio documento: [`ADMIN-PLAN.md`](./ADMIN-PLAN.md). Va en la **misma app** Next.js bajo `/admin`.

---

## 0. Hallazgos de relevamiento (fuentes reales)

| Tema | Fuente | Hecho |
|---|---|---|
| Catálogo + precios | `sync-erp-woocommerce-v3/src/sync/SyncService.js` (269–310) | ERP REST en `http://api.farmatotal.com.py/farma/next/ecommerce/`, endpoints `producto` (delta) y `product/list` (full). Auth probable por **IP whitelist** (sin key visible). |
| Campos ERP | idem + `QueueProcessor.js` (157–175) | `art_codigo` (SKU), `art_cod_int`, `art_desc`, `art_descripcion(_larga)`, `art_precio_vta`, `art_precio_promo` + `art_ind_promo`, `art_porc_promo`, `art_cod_promo`, `art_stock` (global), `art_controlado`, `art_ind_destacado`, `flia_codigo` (categoría), `eco_estado` (`P`=publicado). |
| Stock por sucursal | `wp-content/plugins/sync-erp-woocommerce1/includes/class-stock-sync.php` (93–129) | **No** viene de la API ERP directa: el plugin lo pide a un **backend Node** (`sync_erp_backend_url`, default `http://localhost:3001`) vía `GET /api/stock/all`, que devuelve `{ cod_interno, stock_data: { branch_id: cantidad } }`. **Es un mapa sucursal→cantidad**. |
| Métodos de pago | `themes/bacola-child/functions.php` (275–277) | Mapa: `Tarjeta de Crédito/Débito (Online)=2`, `Crédito (Contra Entrega)=2`, `Débito (Contra Entrega)=3`. |
| Pasarela online | grep en `orders-api.php` + `functions.php` | **No hay gateway Bancard/vPOS integrado** en el código espejado → la pasarela es **greenfield**. Necesita credenciales del portal Bancard. |
| Pedidos | `themes/bacola-child/orders-api.php`; `class-stock-sync.php` (header) | Hay API custom de pedidos en el theme y el sync también empuja pedidos al ERP (`SyncERP_OrderSync`). A inspeccionar el payload exacto antes de implementar el push de pedidos. |

---

## 1. Stack recomendado

**Next.js 16 (Route Handlers, `app/api/*`) + Prisma + PostgreSQL**, una sola app full-stack.

- **Por qué**: un solo deploy, los tipos de `src/types/index.ts` se traducen 1:1 a modelos Prisma, SSR para SEO de catálogo, y dev local trivial (`docker compose` con Postgres). Ship en semanas, no meses.
- **Alternativa** (anotada, no recomendada para arrancar): API dedicada NestJS/Fastify separada del front. Más estructura y escalado independiente, pero dobla el costo operativo para un equipo chico. Reversible: los Route Handlers se pueden extraer a un servicio aparte después.
- Auxiliares: `argon2` (hash de password), `zod` (validación de payloads), `node-cron`/Vercel Cron (sync ERP), `pino` (logs).

> ⚠️ Recordatorio del repo (`clone/AGENTS.md`): esta versión de Next tiene breaking changes — leer `node_modules/next/dist/docs/` antes de escribir handlers/server actions.

---

## 2. Esquema de datos (Prisma / PostgreSQL)

Derivado de `clone/src/types/index.ts` + sucursales + inventario + pagos + log de sync. Dinero en **PYG (guaraníes), enteros** (sin decimales).

```prisma
// ---------- Catálogo (origen: ERP) ----------
model Category {
  id        String    @id @default(cuid())
  slug      String    @unique          // "medicamentos"
  name      String                     // "Medicamentos"
  fliaCodigo String?  @unique          // ERP flia_codigo
  icon      String?
  products  Product[]
}

model Product {
  id          String   @id @default(cuid())
  sku         String   @unique          // ERP art_codigo
  codInterno  String?  @unique          // ERP art_cod_int
  slug        String   @unique
  title       String                    // art_desc
  description String?  @db.Text          // art_descripcion_larga
  brand       String?
  priceNormal Int                        // art_precio_vta (PYG)
  priceWeb    Int                        // art_precio_promo si art_ind_promo
  onPromo     Boolean  @default(false)   // art_ind_promo
  promoCode   String?                    // art_cod_promo
  controlled  Boolean  @default(false)   // art_controlado
  featured    Boolean  @default(false)   // art_ind_destacado
  published   Boolean  @default(true)    // eco_estado = 'P'
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  images      ProductImage[]
  inventory   Inventory[]
  reviews     Review[]
  syncedAt    DateTime @updatedAt
  @@index([categoryId])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  position  Int     @default(0)
}

// ---------- Sucursales + stock (origen: middleware Node /api/stock/all) ----------
model Branch {
  id        String  @id @default(cuid())
  erpId     String  @unique           // branch_id del mapa stock_data
  name      String                    // "Médicos del Chaco"
  address   String?
  lat       Float?
  lng       Float?
  inventory Inventory[]
}

model Inventory {
  productId String
  branchId  String
  quantity  Int      @default(0)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  branch    Branch   @relation(fields: [branchId], references: [id], onDelete: Cascade)
  @@id([productId, branchId])
}

// ---------- Usuarios (migrar desde wp_users) ----------
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String                       // argon2; legacy WP phpass → rehash al primer login
  firstName    String
  lastName     String
  phone        String?
  legacyWpId   Int?      @unique            // mapeo de migración
  addresses    Address[]
  orders       Order[]
  reviews      Review[]
  sessions     Session[]
  createdAt    DateTime  @default(now())
}

model Session {              // auth por cookie httpOnly
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
}

model Address {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  label     String?
  line1     String
  city      String
  phone     String?
  isDefault Boolean @default(false)
}

// ---------- Pedidos (migrar desde wp_posts shop_order) ----------
model Order {
  id            String      @id @default(cuid())
  number        String      @unique          // "FT-84456"
  userId        String?
  user          User?       @relation(fields: [userId], references: [id])
  status        OrderStatus @default(PENDING)
  subtotal      Int
  discount      Int         @default(0)
  total         Int
  couponCode    String?
  paymentMethod String?                       // mapa functions.php (online=2, etc.)
  branchId      String?                       // sucursal de retiro
  legacyWpId    Int?        @unique
  lines         OrderLine[]
  payment       Payment?
  createdAt     DateTime    @default(now())
}

model OrderLine {
  id        String @id @default(cuid())
  orderId   String
  order     Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  sku       String
  title     String
  quantity  Int
  unitPrice Int
}

enum OrderStatus { PENDING PAID PROCESSING SHIPPED COMPLETED CANCELLED REFUNDED }

// ---------- Cupones (migrar desde wp_posts shop_coupon) ----------
model Coupon {
  id          String  @id @default(cuid())
  code        String  @unique
  percent     Int                             // 10 = 10%
  description String?
  active      Boolean @default(true)
  expiresAt   DateTime?
}

model Review {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  author    String
  rating    Int                                // 1..5
  body      String   @db.Text
  createdAt DateTime @default(now())
}

// ---------- Pagos (Bancard) ----------
model Payment {
  id            String        @id @default(cuid())
  orderId       String        @unique
  order         Order         @relation(fields: [orderId], references: [id])
  provider      String        @default("bancard")
  amount        Int
  status        PaymentStatus @default(PENDING)
  transactionId String?       @unique          // idempotencia de webhook
  rawPayload    Json?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

enum PaymentStatus { PENDING REDIRECTED PAID FAILED EXPIRED REFUNDED }

// ---------- Operación ----------
model ErpSyncLog {
  id         String   @id @default(cuid())
  type       String                            // "full" | "delta" | "stock"
  ok         Boolean
  itemsCount Int      @default(0)
  message    String?
  ranAt      DateTime @default(now())
}
```

---

## 3. Superficie de la API (un handler por página del front)

| Ruta | Método | Body / query | Respuesta | Usado por |
|---|---|---|---|---|
| `/api/products` | GET | `?category&q&min&max&sort&page` | `{ items, total, page }` | `/catalogo`, `/categoria/[slug]`, `/buscar` |
| `/api/products/[slug]` | GET | — | `Product` + `gallery` + `reviews` | `/producto/[slug]` |
| `/api/search/suggest` | GET | `?q` | `Product[]` (top 6) | autocomplete del header |
| `/api/branches` | GET | — | `Branch[]` | selector de sucursal, `/sucursales` |
| `/api/products/[slug]/stock` | GET | — | `{ branchId: qty }` | "Sucursal más cercana" / disponibilidad |
| `/api/coupons/validate` | POST | `{ code, subtotal }` | `{ valid, percent, discount }` | carrito |
| `/api/checkout` | POST | `{ lines, couponCode, branchId, paymentMethod, address }` | `{ orderId, paymentRedirectUrl? }` | `/caja` |
| `/api/orders/[id]` | GET | (sesión) | `Order` | `/pedido-recibido`, `/rastrear-pedido` |
| `/api/payments/bancard/callback` | POST | webhook Bancard | `200` idempotente | confirmación de pago |
| `/api/auth/register` | POST | `{ firstName, lastName, email, password }` | set-cookie sesión | `/mi-cuenta` |
| `/api/auth/login` | POST | `{ email, password }` | set-cookie sesión | `/mi-cuenta` |
| `/api/auth/logout` | POST | — | clear cookie | header / dashboard |
| `/api/account/me` | GET | (sesión) | `User` | dashboard |
| `/api/account/orders` | GET | (sesión) | `Order[]` | dashboard → Pedidos |
| `/api/account/addresses` | GET/POST/PUT/DELETE | (sesión) | `Address[]` | dashboard → Direcciones |

> El **carrito** y los **favoritos** siguen client-side (localStorage) como ahora; se validan/recalculan en `/api/checkout` y `/api/coupons/validate`. No requieren tabla salvo que se pida "carrito persistente entre dispositivos" (ver Abiertas).

---

## 4. Integración ERP (job de sincronización)

Reusa el mapeo `art_* → modelo` ya verificado. El backend nuevo es **fuente de verdad** del storefront; el ERP es upstream.

- **Catálogo full** (`GET product/list`, 90s): nocturno. Upsert idempotente por `sku = art_codigo`. Crea/actualiza `Product`, `Category` (por `flia_codigo`), `ProductImage`.
- **Delta** (`GET producto`, 30s): cada N minutos (config). Mismo upsert, solo cambios.
- **Stock por sucursal** (`GET /api/stock/all` del middleware Node, o endpoint ERP equivalente a confirmar): pobla `Inventory` (product × branch). `Product.stock` "global" = `SUM(Inventory.quantity)` calculado.
- Mapeo precio: `priceNormal=art_precio_vta`; si `art_ind_promo` → `priceWeb=art_precio_promo`, `onPromo=true`; si no, `priceWeb=priceNormal`.
- Cada corrida escribe `ErpSyncLog`. Alertas reutilizables vía el patrón WhatsApp del sync actual.

---

## 5. Auth

**Sesión por cookie `httpOnly` + `Secure` + `SameSite=Lax`**, token opaco en tabla `Session`. Preferido sobre JWT-en-localStorage: inmune a robo por XSS y permite revocación inmediata (logout / cambio de password). Password con **argon2**. Passwords legacy de WP (`phpass`) se **re-hashean al primer login exitoso** (verificar con phpass, luego guardar argon2).

---

## 6. Pagos — Bancard (greenfield)

Pasarela de Paraguay (vía Century como adquirente). Flujo típico vPOS:

```
checkout → crea Order(PENDING) + Payment(PENDING)
        → single_buy a Bancard → recibe process_id
        → redirect/iframe al checkout de Bancard         [Payment: REDIRECTED]
        → usuario paga
        → Bancard llama /api/payments/bancard/callback   [confirmación server-to-server]
        → verificar firma/token + transactionId (idempotente)
        → Payment: PAID|FAILED ; Order: PAID|CANCELLED
        → push del pedido al ERP (SyncERP_OrderSync-equivalente)
```

- Idempotencia por `transactionId`; un callback repetido no duplica estado.
- Moneda **PYG**, montos enteros.
- ⚠️ **Dependencia abierta**: requiere credenciales del **portal Bancard** (public/private key, entorno staging vs prod, URL de callback). Sin esto se implementa contra el **sandbox de Bancard** y se deja "Contra Entrega" como método sin pasarela (ya está en el mapa del theme).

---

## 7. Migración desde WooCommerce (porque reemplaza Woo)

Script único de ETL MySQL(Woo) → PostgreSQL. Productos **no** se migran (se re-sincronizan del ERP); se migran personas e historial:

| Destino | Origen WooCommerce | Notas |
|---|---|---|
| `User` | `wp_users` + `wp_usermeta` | `legacyWpId=ID`; password phpass → rehash al login. |
| `Address` | `wp_usermeta` (`billing_*`, `shipping_*`) | una default por usuario. |
| `Order` + `OrderLine` | `wp_posts` (`post_type=shop_order`) + `wp_postmeta` + `wp_woocommerce_order_items`/`_itemmeta` | `legacyWpId`; mapear estados Woo (`wc-completed`, etc.) → `OrderStatus`. |
| `Coupon` | `wp_posts` (`post_type=shop_coupon`) + meta | `percent` desde `coupon_amount`. |
| números de pedido | meta `_order_number` o `ID` | preservar para que `/rastrear-pedido` siga resolviendo históricos. |

Validación: contar filas origen vs destino; checksum de totales de pedidos.

---

## 8. Preguntas abiertas (= desglose de trabajo)

| # | Pregunta | ¿Bloquea implementación? |
|---|---|---|
| 1 | Credenciales/portal **Bancard** (keys, entorno, callback). | **Sí** para pagos online. No para el resto (usar sandbox + contra-entrega). |
| 2 | Endpoint definitivo de **stock por sucursal**: ¿reusar middleware Node `/api/stock/all` o pedir endpoint ERP directo? | **Sí** para disponibilidad por sucursal. No para catálogo. |
| 3 | **Auth del ERP**: confirmar que es IP whitelist y qué IP autorizar (dev local → ¿túnel/VPN?). | Parcial: el sync corre localmente, pero dev local podría no estar whitelisteado. |
| 4 | Payload exacto de **push de pedidos al ERP** (`orders-api.php` + `SyncERP_OrderSync`). | No para storefront; sí para cerrar el ciclo de venta. |
| 5 | Listado real de **sucursales** (IDs `branch_id` ↔ nombre/dirección/geo). | No (se puede sembrar y refinar). |
| 6 | ¿Carrito **persistente** entre dispositivos (requiere login + tabla Cart)? | No (hoy client-side alcanza). |
| 7 | Fecha/criterio de **corte de migración** Woo → nuevo (congelar Woo). | No para construir; sí para el switch. |

---

## 9. Orden de implementación sugerido (fases)

1. **Infra local**: `docker compose` (Postgres) + Prisma + migrations + seed mínimo. App Next corriendo contra DB.
2. **Sync ERP (catálogo)**: job full+delta → `Product`/`Category`/`ProductImage`. Conectar `/api/products*` y reemplazar `src/lib/catalog.ts` mock por fetch real.
3. **Sucursales + stock**: `Branch`/`Inventory` + `/api/branches` + `/stock`. Cablear selector de sucursal y disponibilidad.
4. **Auth real**: register/login/logout/sesión + dashboard contra `/api/account/*`.
5. **Checkout + pedidos**: `/api/checkout`, `/api/orders/[id]`, cupones server-side. Order(PENDING) sin pago aún.
6. **Pagos Bancard**: sandbox → state machine → callback. (Desbloquea con credenciales.)
7. **Migración Woo**: ETL usuarios/pedidos/cupones + validación.
8. **Hardening**: rate-limit auth, validación zod en todos los handlers, push de pedidos al ERP, observabilidad.

---

*Artefactos relacionados: `clone/docs/research/GAP-ANALYSIS.md`, `clone/src/types/index.ts`, `clone/src/lib/catalog.ts`, `_recon/`, proyecto `sync-erp-woocommerce-v3`.*
