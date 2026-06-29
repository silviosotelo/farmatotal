# FARMATOTAL — Master Blueprint

**Versión:** 1.0
**Fecha:** 27 de junio de 2026
**Objetivo:** Documento único y definitivo que define el sistema completo. Todo desarrollador (humano o modelo) DEBE leer este documento antes de tocar código.

---

## 1. Mission Statement

Farmatotal es una plataforma e-commerce empresarial de próxima generación, multi-tenant, multi-tienda, construida desde cero para reemplazar:

- **WordPress** (CMS + gestión de contenido)
- **WooCommerce** (e-commerce + catálogo)
- **Elementor** (page builder visual)
- **Integraciones ERP** (sincronización bidireccional)
- **Gestión de inventario** (multi-sucursal, stock en tiempo real)
- **Pasarelas de pago** (Bancard vPOS, Tigo Money, Dinelco, PersonalPay)
- **Arquitectura white-label** (multi-store con temas configurables)

El sistema debe soportar:
- **40,000+ productos** activos
- **66 sucursales** físicas
- **Multi-tenant** (múltiples negocios en una instancia)
- **Multi-tema** (farmacia, grocery, fashion, etc.)
- **Multi-tienda** (storefronts por tenant)
- **Inventario real-time** (stock por sucursal)
- **Sincronización ERP** (push de productos, stock, pedidos)
- **Procesamiento de pagos seguro** (iframe Bancard, nunca toca el frontend)

**País target:** Paraguay (Guaraní como moneda, IVA 10%/5%/exento, RUC/CI como documentos)

---

## 2. Non-Negotiable Architecture

### Stack tecnológico (NO negociable)

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm + Turborepo |
| API | Fastify + TypeScript |
| Admin | React + Vite |
| Storefront | Next.js 16 (SSR) |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM |
| Cache/Colas | Redis 7 (BullMQ) |
| Multi-tenancy | Header `x-tenant` → schema `app.*` |
| Contratos compartidos | Zod |
| UI Library | Ecme (@platform/ui) |
| Page Builder | ChaiBuilder SDK + @platform/engine |
| Deploy | GitHub Actions → Docker |

### NUNCA introducir

- ❌ Prisma
- ❌ Sequelize
- ❌ TypeORM
- ❌ MongoDB
- ❌ MySQL
- ❌ Sequelize
- ❌ HTML custom (todo debe ser componente Ecme)
- ❌ Valores hardcodeados (todo config-driven desde plugin registry)
- ❌ Keys sensibles expuestas al frontend

### Reglas de arquitectura

1. **Monorepo con separación clara:** `apps/api`, `apps/store`, `apps/admin`, `packages/ui`, `packages/engine`, `packages/shared-types`
2. **API como fuente de verdad:** El store y admin leen de la API, nunca de la DB directamente
3. **Multi-tenant por header:** `x-tenant` en cada request, todas las queries filtran por `tenant_id`
4. **Config-driven:** Todo configurable desde el admin (plugins, themes, campos, textos, etc.)
5. **Plugin system:** Los plugins extienden el sistema sin crear tablas nuevas (usando metadata tables)

---

## 3. Core Principles

### Principle 1 — Server Authoritative Pricing

**El cliente NUNCA envía precios al server.** El server es la autoridad de precios.

**El cliente solo envía:**
- `productId`
- `variantId` (opcional)
- `quantity`

**El server calcula:**
- `price` (base del producto, price lists, promotions)
- `tax` (por tasa, por línea)
- `shipping` (por zona, por método)
- `discount` (promotions + coupons)
- `total` (subtotal + tax + shipping - discount)

```
Client → {productId, variantId, quantity}
Server → fetches product → applies pricing → calculates tax → applies promotions → calculates shipping → returns total
```

**NUNCA confiar en el precio que el frontend envía.** Siempre recalcular en el backend.

### Principle 2 — Transactions First

Toda operación crítica de comercio DEBE ser transaccional:

- **Checkout:** order + order_items + order_taxes + order_meta + payments
- **Refund:** refund + refund_items + order update + inventory restore
- **Payment confirmation:** payment update + order status + inventory consume
- **Stock reservation:** inventory update + stock_movements
- **Stock restoration:** inventory update + stock_movements

```
BEGIN
  -- 1. Crear order
  -- 2. Crear order_items
  -- 3. Crear order_taxes
  -- 4. Reservar inventory
  -- 5. Crear payment attempt
  -- 6. Publicar eventos (outbox)
COMMIT
```

Si falla en cualquier paso, TODO se revierte. No hay estados inconsistentes.

### Principle 3 — Inventory Consistency

**NUNCA vender de más.** Modelo de stock:

```
on_hand (stock físico en sucursal)
reserved (bloqueado durante checkout, TTL)
available = on_hand - reserved
```

**Flujo de inventory:**
1. Checkout inicia → `reserve(orderId, lines)` → incrementa `reserved`
2. Pago confirmado → `consume(orderId)` → decrementa `on_hand`, libera `reserved`
3. Pago fallido/cancelado → `release(orderId)` → decrementa `reserved
4. Reembolso → `restoreStock(orderId)` → incrementa `on_hand`

**Nunca decrementar `on_hand` directamente en el checkout.** Siempre reservar primero.

### Principle 4 — Multi-Tenant Isolation

**Todo tiene `tenant_id`. Sin excepciones.**

Todas las queries incluyen `WHERE tenant_id = tid(req)`.
Un tenant NUNCA puede ver datos de otro tenant.

Tablas sin `tenant_id` son globales por diseño (countries, currencies) — y NUNCA contienen datos de negocio.

### Principle 5 — Async Side Effects

**NUNCA ejecutar efectos secundarios síncronos dentro del request.**

| Efecto | Método |
|---|---|
| Envío de emails | Outbox → Worker (BullMQ) |
| Notificaciones push | Outbox → Worker |
| Webhooks | Outbox → Worker (retry con backoff) |
| Sincronización ERP | Outbox → Worker |
| Webhooks registrados | Outbox → Worker (HMAC-SHA256 signed) |

**Transactional Outbox pattern:**
```
BEGIN
  -- Operación principal (order, payment, etc.)
  -- INSERT INTO outbox (event_type, payload, tenant_id)
COMMIT
-- Worker procesa outbox en background
```

**Los eventos NUNCA se pierden** porque se escriben en la misma transacción que la operación.

---

## 4. Full Domain Structure

### Identity
```
users          → Staff del admin (email, password_hash, role)
usermeta       → Metadata extensible de usuarios
sessions       → Sesiones activas
tokens         → Refresh tokens
```

### Catalog
```
posts          → Entidad universal (type=product/page/slide/blog_post)
postmeta       → Metadata flexible de posts (plugins extienden sin migrar)
products       → Datos de comercio del producto (SKU, precios, stock)
product_images → Imágenes del producto
product_variations → Variantes (talla, color, etc.)
product_specifications → Ficha técnica (group, label, value)
product_attributes → Definiciones de atributos (Color, Talle, etc.)
product_attribute_values → Valores de atributos (Rojo, L, XL)
product_attribute_mappings → Relación producto↔valor de atributo
```

### Taxonomy (WP-style)
```
terms          → Categorías, marcas, tags, atributos (unificados)
termmeta       → Metadata de términos
term_relationships → Relación post↔term
```

### Pricing
```
options        → Configuración de pricing (reemplaza settings)
coupons        → Cupones de descuento
coupon_usages  → Historial de uso de cupones
```

### Inventory
```
branches       → Sucursales físicas
branch_meta    → Metadata de sucursales
inventory      → Stock por producto×sucursal
stock_movements → Auditoría de movimientos de stock
```

### Orders
```
orders         → Pedidos
order_items    → Líneas del pedido
order_meta     → Metadata flexible de pedidos
order_taxes    → Impuestos por línea
order_notes    → Notas internas
order_tracking → Tracking de envío
refunds        → Reembolsos
refund_items   → Items de reembolso
```

### Payments
```
payment_gateways → Gateways configurados
payment_gateway_meta → Config de gateways (keys sensibles)
payments         → Transacciones de pago
```

### Customers
```
customers      → Clientes del storefront
customer_meta  → Metadata de clientes
addresses      → Direcciones de clientes
```

### Logistics
```
shipping_zones → Zonas de envío
shipping_zone_locations → Ubicaciones de zonas
shipping_methods → Métodos de envío
shipping_zone_methods → Métodos por zona (con costo)
tax_classes    → Clases de impuesto
tax_rates      → Tasas de impuesto
```

### Reviews
```
product_reviews → Reseñas de productos (rating, author, status)
```

### Media
```
media          → Archivos multimedia
```

### Email
```
email_templates → Templates de email
email_queue    → Cola de envío
email_log      → Log de emails enviados
```

### WhatsApp
```
wa_templates   → Templates de WhatsApp
wa_workflows   → Workflows automáticos
wa_log         → Log de mensajes
```

### ERP Integration
```
erp_api_keys   → API keys para ERP
erp_webhooks   → Webhooks registrables
erp_webhook_deliveries → Log de entregas de webhooks
erp_field_mappings → Mapeo de campos ERP↔plataforma
```

### Sync
```
sync_runs      → Historial de sincronizaciones
sync_errors    → Errores por registro
```

---

## 5. State Machines

### Order State Machine

```
┌─────────┐
│  draft  │
└────┬────┘
     │ createOrder()
     ▼
┌─────────┐
│ pending │ ← Esperando pago
└────┬────┘
     │ payment confirmed (webhook)
     ▼
┌───────────┐
│ confirmed │ ← Pago aprobado
└─────┬─────┘
       │ beginFulfillment()
       ▼
┌─────────────┐
│ processing  │ ← Preparando envío
└──────┬──────┘
       │ shipOrder() / markDelivered()
       ▼
┌───────────┐
│ completed │ ← Entregado
└───────────┘

Cancelación (desde cualquier estado excepto completed):
pending → cancelled
confirmed → cancelled
processing → cancelled

Reembolso (solo desde completed):
completed → refunded (parcial o total)
```

### Payment State Machine

```
┌─────────┐
│ pending │ ← Intento creado
└────┬────┘
     │ webhook auth="S" + response_code="0"
     ▼
┌─────────────┐
│ authorized  │ ← Autorizado por el gateway
└──────┬──────┘
       │ settlement
       ▼
┌─────┐
│ paid│ ← Fondos capturados
└─────┘

Error (desde pending/authorized):
pending → failed
authorized → cancelled

Reembolso (desde paid):
paid → refunded (parcial o total)
paid → partial_refund
```

### Fulfillment State Machine

```
┌─────────┐
│ pending │
└────┬────┘
     │ beginFulfillment()
     ▼
┌───────────┐
│ preparing │ ← Empaquetando
└─────┬─────┘
       │ shipOrder()
       ▼
┌─────────┐
│ shipped │ ← En tránsito
└────┬────┘
     │ markDelivered()
     ▼
┌───────────┐
│ delivered │ ← Recibido
└───────────┘

Cancelación:
pending → cancelled

Devolución:
delivered → returned
```

---

## 6. Folder Structure Rules

### API (`apps/api/src/`)
```
modules/
  {domain}/
    routes.ts      → Endpoints HTTP (solo validación + delegación a service)
    service.ts     → Lógica de negocio (usa repositories)
    repository.ts  → Queries a DB (Drizzle ORM)
    schemas.ts     → Tipos Zod para request/response
    domain.ts      → Entidades de dominio (tipos, interfaces)
```

### Store (`apps/store/src/`)
```
app/(site)/
  {route}/
    page.tsx       → Server component (page shell)
    {sub}/page.tsx → Sub-rutas
components/
  cms/             → CMS blocks (ChaiRender)
  commerce/        → Componentes compartidos
  providers/       → Context providers
lib/               → Utilidades, API client, hooks
themes/            → Definiciones de temas
```

### Admin (`apps/admin/src/`)
```
views/concepts/
  {module}/
    ModuleName.tsx → Vista principal
    components/    → Sub-componentes
services/
  ModuleService.ts → API client
```

### Regla fundamental
**NUNCA colocar lógica de negocio en route handlers.** Los routes solo validan input y delegan al service.

---

## 7. Coding Rules

### TypeScript
- **Strict mode** (`strict: true` en tsconfig)
- **No `any`** — usar tipos explícitos siempre
- **No business logic in controllers** — solo validación + delegación
- **No duplicated DTOs** — un solo tipo por entidad
- **No magic strings** — usar enums o constants
- **No hidden side effects** — toda función debe ser predecible

### Naming
- Services: `noun + verb` → `orderService.createOrder()`
- Repositories: `noun + action` → `productRepository.findById()`
- Schemas: `entity + operation` → `createOrderSchema`
- Types: `noun` → `Order`, `OrderLine`, `OrderStatus`

### Code patterns
```typescript
// ✅ Correcto: service encapsula lógica
async function createOrder(input: CreateOrderInput): Promise<Order> {
  const cart = await cartRepository.findById(input.cartId)
  invariant(cart, "Cart not found")
  const pricing = await pricingEngine.calculate(cart)
  const order = await orderRepository.create({ ...input, ...pricing })
  await outbox.publish("order.created", { orderId: order.id })
  return order
}

// ❌ Incorrecto: lógica en route handler
app.post("/orders", async (req) => {
  const order = await db.insert(orders).values(req.body)  // WRONG
  return order
})
```

---

## 8. Database Rules

### Tipos de datos
- **IDs:** UUID con `gen_random_uuid()` — NUNCA integer auto-increment
- **Precios:** `DECIMAL(10,2)` — NUNCA float ni integer para dinero
- **Monedas:** `VARCHAR(3)` ISO 4217 (PYG, USD, BRL, ARS, EUR)
- **Fechas:** `TIMESTAMPTZ` — siempre timezone-aware
- **Booleans:** `BOOLEAN NOT NULL DEFAULT false/true`
- **JSON:** Solo para metadata secundaria (postmeta, order_meta, options)

### Multi-tenancy
- **Toda tabla de negocio tiene `tenant_id UUID NOT NULL REFERENCES app.tenants(id)`**
- **Todas las queries filtran por `tenant_id`**
- **Los índices incluyen `tenant_id` como primer campo**

### Soft delete
- Usar `deleted_at TIMESTAMPTZ` en entidades principales (products, orders, customers, branches)
- Queries: `WHERE deleted_at IS NULL`
- NUNCA hard delete en datos de negocio

### Índices requeridos
- UNIQUE en campos de business key (SKU, slug, code, email)
- INDEX en foreign keys
- INDEX compuesto en tenant_id + campos de filtro frecuente
- INDEX en campos de búsqueda (search, status, date)

### NUNCA permitir
- ❌ JSON blobs para entidades core (solo metadata secundaria)
- ❌ Float para dinero
- ❌ Integer auto-increment para IDs
- ❌ Queries sin tenant_id
- ❌ Foreign keys opcionales en tablas core

---

## 9. Testing Requirements

### Módulos que REQUIEREN tests

| Módulo | Unit | Integration | Concurrency |
|---|---|---|---|
| **Checkout** | ✅ | ✅ | ✅ |
| **Payments** | ✅ | ✅ | ✅ |
| **Inventory** | ✅ | ✅ | ✅ |
| **ERP Sync** | ✅ | ✅ | ✅ |
| **Pricing** | ✅ | ✅ | — |
| **Orders** | ✅ | ✅ | — |
| **Cart** | ✅ | — | — |

### Tests de concurrencia (críticos)
```typescript
// Dos usuarios compran el último producto al mismo tiempo
test("concurrent checkout does not oversell", async () => {
  // Crear producto con stock=1
  // Ejecutar 2 checkouts en paralelo
  // Verificar que solo 1 pasa y el otro falla
})
```

### Tests de idempotency
```typescript
// Webhook de Bancard llega 2 veces
test("duplicate webhook does not double-charge", async () => {
  // Enviar mismo webhook 2 veces
  // Verificar que el pago se marca una sola vez
})
```

---

## 10. Security Rules

### SECURITY IS NON-NEGOTIABLE

1. **NUNCA confiar en input del cliente** — Siempre validar con Zod
2. **NUNCA confiar solo en el header x-tenant** — Verificar JWT + tenant membership
3. **NUNCA exponer endpoints sensibles públicamente** — Webhooks con HMAC, API keys con scopes
4. **SIEMPRE validar ownership** — Un usuario solo puede ver/modificar sus propios datos
5. **SIEMPRE verificar permisos** — RBAC check antes de cada operación admin
6. **NUNCA logear passwords o tokens** — Solo hashes
7. **SIEMPRE rate limiting** — En endpoints públicos y de pago
8. **NUNCA almacenar secrets en env vars expuestas** — Usar vault o encrypted storage
9. **SIEMPRE HTTPS** — Nada de HTTP en producción
10. **NUNCA confiar en precios del frontend** — Siempre recalcular server-side

### Sensitive fields
- API keys: SHA-256 hasheadas, plaintext mostrada solo UNA VEZ
- Payment keys: `is_sensitive=true` en meta → `"••••••••"` en GET responses
- Passwords: Argon2 hash, nunca plaintext

---

## 11. Performance Constraints

### Targets
| Operación | Target |
|---|---|
| Catálogo page (list) | < 300ms |
| Product page (detail) | < 500ms |
| Checkout completo | < 1500ms |
| Payment webhook | < 500ms |
| Búsqueda | < 200ms |

### Diseñado para
- **1,000 usuarios concurrentes**
- **40,000+ productos**
- **66 sucursales**
- **Multi-tenant** (no compartido)

### Optimizaciones
- **Pagination:** Nunca cargar todo en memoria
- **Caching:** Cache de pricing, categories tree, store config
- **Indexes:** Queries frecuentes con índices compuestos
- **Batch operations:** Bulk inserts/updates para ERP sync
- **Connection pooling:** PostgreSQL pg pool, Redis connection pool
- **Lazy loading:** Admin y store cargan módulos bajo demanda

---

## 12. Task Execution Protocol

### Para CADA tarea de desarrollo:

**1. Entender contexto**
- ¿Qué módulo afecta?
- ¿Qué entidades involucra?
- ¿Qué tablas se modifican?

**2. Identificar módulos impactados**
- ¿Qué rutas se afectan?
- ¿Qué services cambian?
- ¿Qué components del store/admin se modifican?

**3. Analizar schema**
- ¿Qué columnas/tablas se necesitan?
- ¿Hay migraciones?
- ¿Se rompen queries existentes?

**4. Analizar dependencias**
- ¿Qué otros módulos dependen de esto?
- ¿Hay hooks/events que se disparan?
- ¿Hay webhooks que se afectan?

**5. Identificar riesgos**
- ¿Se puede romper el checkout?
- ¿Se puede perder inventory?
- ¿Se puede romper el multi-tenancy?
- ¿Hay security implications?

**6. Proponer plan de implementación**
- Archivos a crear/modificar
- Orden de implementación
- Testing strategy

**7. Esperar aprobación**

**8. Implementar**

**9. Escribir tests**

**10. Validar constraints**
- ¿Todos los requests tienen tenant_id?
- ¿Todos los precios se calculan server-side?
- ¿Las transacciones son atómicas?
- ¿Los efectos secundarios son async?

### Formato de prompt para tareas

```
TASK: Implement [feature]

CONTEXT: Farmatotal uses Fastify + Drizzle + PostgreSQL + Redis

GOAL: [What we're trying to achieve]

CONSTRAINTS:
- tenant-aware
- transactional
- server-authoritative pricing
- testable
- config-driven

SCHEMA: [affected tables]
ENTITIES: [affected domains]
DEPENDENCIES: [affected modules]

OUTPUT:
1. Schema changes (DML)
2. Domain types
3. Repository layer
4. Service layer
5. Route handlers
6. Tests
7. Admin UI changes (if any)
8. Store changes (if any)
```

---

## Apéndice A: Eventos del Sistema

### Domain Events

| Evento | Disparador | Consumidores |
|---|---|---|
| `order.created` | Checkout completado | ERP push, email confirmación, WhatsApp notificación |
| `order.paid` | Webhook Bancard confirma | ERP push, email confirmación, inventory consume |
| `order.shipped` | Fulfillment update | Email tracking, WhatsApp notificación |
| `order.delivered` | Fulfillment update | Email encuesta, CRM update |
| `order.cancelled` | Cancelación | ERP push, email cancelación, inventory release |
| `order.refunded` | Reembolso | ERP push, email reembolso, inventory restore |
| `product.updated` | ERP push product | Storefront cache invalidation |
| `inventory.updated` | ERP push stock | Storefront stock update |
| `coupon.used` | Checkout con cupón | Usage count update |
| `review.created` | Customer review | Moderation queue |

### Outbox Pattern

```typescript
// Dentro de una transacción:
await db.insert(orders).values(orderData)
await db.insert(orderItems).values(itemsData)
await db.insert(outbox).values({
  event_type: "order.created",
  payload: { orderId: order.id, tenantId },
  status: "pending"
})
// COMMIT

// Worker (background):
const pending = await db.select().from(outbox).where(eq(outbox.status, "pending"))
for (const event of pending) {
  await dispatchWebhooks(event)
  await sendEmails(event)
  await pushToErp(event)
  await db.update(outbox).set({ status: "sent" }).where(eq(outbox.id, event.id))
}
```

---

## Apéndice B: Checkout Flow Completo (16 pasos)

```
1.  Validate idempotency key
2.  Load cart + version check (optimistic locking)
3.  Validate cart contents (items exist, in stock, prices valid)
4.  Calculate pricing (subtotal from server-side product prices)
5.  Apply promotions (per-line or cart-wide)
6.  Apply coupons (validate rules, reserve usage)
7.  Calculate taxes (by rate, by line, by destination)
8.  Calculate shipping (by zone, by method)
9.  Calculate final totals
10. Create order (status=pending, payment=unfulfilled)
11. Create order_items + order_taxes + order_meta
12. Create payment attempt (status=pending)
13. Reserve inventory (on_hand += reserved)
14. Call payment gateway (single_buy iframe or charge token)
15. Publish events via outbox (order.created)
16. Return order + payment status to client
```

### Post-checkout (async):
```
Webhook Bancard → payment-webhook-service
  1. Validate token (MD5)
  2. Dedup (check if already processed)
  3. If approved: markPaid() → consume inventory → outbox events
  4. If rejected: markFailed() → release inventory → outbox events
```

---

## Apéndice C: Design Errors to Avoid

1. **No stored floats for money** — Usar DECIMAL(10,2) o BigInt
2. **No trust client prices** — Siempre recalcular server-side
3. **No calculate stock from product table** — Usar inventory table con reserved
4. **No send emails synchronously** — Usar outbox pattern
5. **No use one status field** — Usar 3-track model (order/payment/fulfillment)
6. **No hard delete** — Soft delete con deleted_at
7. **No skip idempotency** — En payment creation, order creation
8. **No reconstruct prices** — Usar price snapshots en order_lines
9. **No store single tax_total** — Usar tax lines por rate
10. **No skip optimistic locking** — Cart version field
11. **No mix domain with HTTP** — Entities no conocen Express/Fastify
12. **No skip transactional outbox** — Eventos en la misma transacción
13. **No ignore webhook retries** — Dedup en handler
14. **No skip inventory reservation** — Antes de payment
15. **No use float for money** — DECIMAL o BigInt
16. **No skip order number uniqueness** — UNIQUE constraint
17. **No hardcode tax rates** — Config-driven desde tax_rates table
18. **No skip refund line items** — refund_items table
19. **No forget cart cleanup** — Después de order confirmada
20. **No skip event publication** — ERP sync requiere events

---

## Apéndice D: Mapa de Implementación

### Fase 1: Core Foundation
- [ ] DB Schema (DML completo — 60 tablas)
- [ ] Multi-tenant middleware
- [ ] Auth system (JWT + API keys)
- [ ] Error handling (DomainError + invariant)
- [ ] Event bus + Outbox
- [ ] Money value object
- [ ] Transaction manager

### Fase 2: Catalog
- [ ] Posts + postmeta CRUD
- [ ] Terms (categories, brands, tags)
- [ ] Products + images + variations
- [ ] Product attributes
- [ ] Specifications
- [ ] Admin UI (products, categories, attributes)

### Fase 3: Inventory
- [ ] Branches CRUD
- [ ] Inventory service (reserve/consume/release)
- [ ] Stock movements audit
- [ ] Admin UI (inventory manager)

### Fase 4: Cart + Pricing
- [ ] Cart entity (session-based + user-based)
- [ ] Pricing engine (subtotal → discounts → taxes → shipping)
- [ ] Coupons + usages
- [ ] Shipping quotes
- [ ] Store cart API

### Fase 5: Checkout + Orders
- [ ] Checkout service (16-step orchestration)
- [ ] Order creation + state machine
- [ ] Order items + taxes + notes + tracking
- [ ] Refunds
- [ ] Admin UI (orders list/detail)

### Fase 6: Payments
- [ ] Payment gateway port (registry pattern)
- [ ] Bancard vPOS integration (single_buy, charge, cards, webhook)
- [ ] Payment attempts + webhooks
- [ ] Admin UI (payment methods, transactions)

### Fase 7: Storefront
- [ ] CMS pages (ChaiBuilder)
- [ ] Product catalog
- [ ] Product detail
- [ ] Cart page
- [ ] Checkout page
- [ ] Payment page (Bancard iframe)
- [ ] Return page (status polling)
- [ ] Account page
- [ ] Multi-theme support

### Fase 8: ERP Integration
- [ ] ERP API keys + auth
- [ ] Catalog push (products, categories, brands)
- [ ] Inventory push (stock batch)
- [ ] Orders pull + status update
- [ ] Pricing push
- [ ] Customers push
- [ ] Webhooks (register, dispatch, retry)

### Fase 9: Admin
- [ ] Dashboard
- [ ] All 25 modules functional
- [ ] Plugin config UI (Ecme Settings pattern)
- [ ] Reports
- [ ] Settings

### Fase 10: Polish
- [ ] Performance optimization
- [ ] Caching layer
- [ ] Error boundaries
- [ ] Loading states
- [ ] Responsive design
- [ ] Dark mode
- [ ] Internationalization
