# WP Logic Blueprint — Análisis Completo

**Fuente:** `C:\Users\sotelos\Downloads\WP Logic`
**Fecha:** 26 de junio de 2026

## Archivos (27)

### Documentación
| Archivo | Contenido |
|---|---|
| `wp-woocommerce-core-logic-to-nextjs.md` | 2,343 líneas — Blueprint completo de lógica WP+WooCommerce → Next.js |
| `wordpress-7.0-woocommerce-10.9.1-db-schema.md` | 1,042 líneas — Schema DB completo WP 7.0 + WC 10.9.1 |

### Blueprint TypeScript (src/)
| Archivo | Líneas | Propósito |
|---|---|---|
| `core/money.ts` | 44 | Value object Money con add/subtract/multiply |
| `core/events.ts` | 16 | DomainEvent bus + Outbox |
| `core/errors.ts` | 21 | DomainError + invariant() |
| `core/transaction.ts` | 3 | TransactionManager.run() |
| `catalog/product.ts` | 66 | Product + Variant + ProductType + purchase validation |
| `cart/cart.ts` | 173 | Cart entity: line hashing, add/set/coupon, optimistic locking |
| `pricing/pricing-engine.ts` | 100 | DefaultPricingEngine: subtotal→discounts→taxes→shipping→fees |
| `promotions/promotions.ts` | 25 | PromotionEngine port |
| `tax/tax.ts` | 33 | TaxEngine port: lines by origin/destination/customer |
| `shipping/shipping.ts` | 28 | ShippingService port: quote rates |
| `inventory/inventory.ts` | 41 | InventoryService: availability, reserve/consume/release |
| `orders/order.ts` | 96 | Order entity: 3 status tracks, transitions |
| `payments/payments.ts` | 51 | PaymentGateway port + registry |
| `checkout/checkout-service.ts` | 201 | Full checkout orchestration (16 steps) |
| `checkout/payment-webhook-service.ts` | 82 | Payment webhook handler |

---

## Patrones Clave del Blueprint

### 1. Entity ≠ ORM ≠ DTO
Domain entities no conocen tablas. Separación estricta.

### 2. Server es autoridad de precios
El cliente NUNCA envía valores monetarios. Todo se calcula en el server.

### 3. 3-Track Status Model
En vez de un solo `status` de WC:
```
orderStatus:    pending → confirmed → completed → cancelled
paymentStatus:  unpaid → authorized → captured → refunded
fulfillmentStatus: unfulfilled → partially_fulfilled → fulfilled → returned
```

### 4. Transactional Outbox
Eventos publicados SOLO después del commit. No emails/webhooks perdidos.

### 5. Inventory Reservations
```
available = on_hand - reserved
reserve() → incrementa reserved, TTL
consume() → decrementa on_hand, libera reserved
release() → decrementa reserved
```

### 6. Cart Line Identity
Hash canónico: `{productId, variantId, options, customization}` — NO el precio del cliente.

### 7. Optimistic Locking
Cart `version` field. `expectedCartVersion` en checkout para detectar cambios concurrentes.

### 8. Idempotency Keys
En order creation, payment creation, inventory operations.

### 9. Price Snapshots
Order lines congelan precios al momento de crear la orden. Nunca reconstruir de producto actual.

### 10. Tax Lines by Rate
Nunca guardar un solo `taxTotal`. Siempre `{rateId, rateName, amount}` para audit/refund/reporting.

---

## Checkout Flow (16 pasos — §9 del blueprint)

```
1. Validate idempotency key
2. Load cart + version check
3. Validate cart contents (items exist, in stock, prices valid)
4. Calculate pricing (subtotal)
5. Apply promotions/coupons → validate, reserve usage
6. Calculate taxes by line
7. Calculate shipping
8. Calculate final totals
9. Create order (pending + order_items + order_taxes + order_meta)
10. Create payment attempt (pending)
11. Reserve inventory (soft-lock)
12. Call payment gateway (create single_buy or charge)
13. Publish events via outbox (order.created)
14. Commit transaction
15. Process outbox (send webhooks, emails)
16. Return order + payment status to client
```

---

## 3-Track Status Transitions

```
orderStatus:
  pending → confirmed → completed → cancelled
  pending → cancelled (no confirm)

paymentStatus:
  unpaid → authorized → captured → refunded
  unpaid → failed

fulfillmentStatus:
  unfulfilled → partially_fulfilled → fulfilled → returned
  unfulfilled → cancelled
```

---

## Money Value Object (core/money.ts)

```typescript
type Currency = "PYG" | "USD" | "BRL" | "ARS" | "EUR"

type Money = {
  amount: bigint  // centavos/milésimas, nunca float
  currency: Currency
}

function add(a: Money, b: Money): Money
function subtract(a: Money, b: Money): Money
function multiply(a: Money, factor: number): Money
function zero(currency: Currency): Money
function serialize(m: Money): number  // → decimal
function deserialize(n: number, currency: Currency): Money
```

---

## Pricing Engine Pipeline

```
Input: { lines, coupon, shippingMethod, branchId, destination }
  ↓
1. Base prices from product/variation (server-side)
2. Promotion discounts (per-line or cart-wide)
3. Coupon discounts (percent or fixed, with limits)
4. Subtotal = sum(line.amount) - discounts
5. Tax calculation (by rate, by line)
6. Shipping calculation (by zone, by method)
7. Fees (if any)
8. Grand total = subtotal + tax + shipping + fees
9. Output: { lines: [{unitPrice, discount, tax, total}], subtotal, taxTotal, shippingTotal, grandTotal }
```

---

## Inventory Service Pattern

```typescript
interface InventoryService {
  availability(productId: string, branchId?: string): Promise<number>
  assertCanAdd(productId: string, quantity: number, branchId?: string): Promise<void>
  reserve(orderId: string, lines: {productId: string, quantity: number}[], branchId?: string): Promise<InventoryReservation>
  consume(orderId: string): Promise<void>  // after payment confirmed
  release(orderId: string): Promise<void>  // after cancellation
}
```

---

## Checkout Service (201 líneas — implementation completa)

El checkout service orquesta todo:
1. Idempotency check
2. Cart load + version lock
3. Cart validation
4. Pricing calculation
5. Coupon reservation
6. Tax calculation
7. Shipping calculation
8. Order creation
9. Payment attempt creation
10. Inventory reservation
11. Gateway call
12. Event publication
13. Transaction commit
14. Outbox processing
15. Response

---

## Design Errors to Avoid (§19 del blueprint)

1. Don't store monetary values as floats
2. Don't trust client-submitted prices
3. Don't calculate stock from product table alone
4. Don't send emails synchronously in checkout
5. Don't use one status field for order/payment/fulfillment
6. Don't delete hard — soft delete with deleted_at
7. Don't skip idempotency on payment creation
8. Don't reconstruct prices from current product (use snapshots)
9. Don't store single tax_total (use tax lines)
10. Don't skip optimistic locking on cart
11. Don't mix domain logic with HTTP concerns
12. Don't skip transactional outbox
13. Don't ignore webhook retries (dedup)
14. Don't skip inventory reservation before payment
15. Don't use float for money calculations
16. Don't skip order number uniqueness check
17. Don't hardcode tax rates
18. Don't skip refund line items
19. Don't forget cart cleanup after order
20. Don't skip event publication for ERP sync
