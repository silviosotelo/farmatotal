# Lógica funcional del Core de WordPress + WooCommerce
## Blueprint para un e-Commerce React / Next.js

**Base analizada:** WordPress 7.0 y WooCommerce 10.9.1.  
**Objetivo:** entender el comportamiento funcional y arquitectónico del Core para reproducir sus capacidades en un sistema moderno, no copiar literalmente su implementación PHP ni su modelo de tablas.

---

# 1. Qué es realmente WordPress + WooCommerce

WordPress aporta un **runtime extensible orientado a contenido**:

1. arranque de aplicación;
2. carga de configuración;
3. registro de plugins;
4. sistema de eventos;
5. autenticación y autorización;
6. resolución de rutas;
7. consulta de contenido;
8. renderizado;
9. REST API;
10. caché;
11. tareas programadas.

WooCommerce se monta sobre ese runtime y aporta un **dominio de comercio electrónico**:

1. catálogo;
2. productos y variaciones;
3. precios;
4. inventario;
5. clientes;
6. sesiones;
7. carrito;
8. promociones;
9. impuestos;
10. envíos;
11. checkout;
12. pedidos;
13. pagos;
14. reembolsos;
15. notificaciones;
16. analítica;
17. integraciones;
18. trabajos en segundo plano.

La arquitectura efectiva puede resumirse así:

```text
HTTP request
    ↓
WordPress bootstrap
    ↓
Plugins + hooks
    ↓
Routing / REST controller
    ↓
WooCommerce application service
    ↓
Domain objects
    ↓
Data store / repository
    ↓
Database + cache
    ↓
Domain/application events
    ↓
Emails + webhooks + background jobs + lookup tables
```

En Next.js conviene conservar el flujo, pero reemplazar cada pieza:

```text
HTTP request
    ↓
Next.js Route Handler / Server Action
    ↓
Application service
    ↓
Domain entities + policies
    ↓
Repository ports
    ↓
PostgreSQL / MySQL + Redis
    ↓
Transactional outbox
    ↓
Workers + webhooks + projections + notifications
```

---

# 2. WordPress Core como plataforma

## 2.1 Bootstrap y ciclo de request

Una petición tradicional de WordPress funciona conceptualmente así:

```text
index.php
  → wp-blog-header.php
    → wp-load.php
      → wp-config.php
      → wp-settings.php
        → carga constantes
        → carga base de datos
        → inicia object cache
        → carga MU plugins
        → carga plugins normales
        → inicializa usuario
        → registra post types y taxonomías
        → ejecuta init
    → construye WP_Query
    → determina template
    → renderiza
```

Para REST:

```text
HTTP /wp-json/...
  → bootstrap normal
  → REST server
  → match de namespace + route
  → permission_callback
  → controller callback
  → JSON response
```

### Equivalencia Next.js

```text
app/api/.../route.ts
  → middleware/auth opcional
  → parseo y validación de request
  → caso de uso
  → transacción
  → serialización de response
```

No conviene trasladar la dependencia de variables globales de WordPress. Usa inyección explícita:

```ts
const checkoutService = new CheckoutService({
  carts,
  products,
  inventory,
  orders,
  payments,
  pricing,
  transaction,
  outbox,
});
```

---

## 2.2 Hooks: Actions y Filters

WordPress y WooCommerce dependen fuertemente de hooks.

### Action

Notifica que ocurrió algo:

```php
do_action('woocommerce_order_status_changed', $id, $from, $to, $order);
```

Semántica:

```text
evento ocurrió → ejecutar cero o más listeners
```

### Filter

Permite transformar un valor antes de continuar:

```php
$total = apply_filters('woocommerce_cart_total', $total, $cart);
```

Semántica:

```text
valor inicial → transformador 1 → transformador 2 → valor final
```

### Equivalencia recomendada

No mezclar ambos conceptos.

```ts
interface DomainEventBus {
  publish(events: DomainEvent[]): Promise<void>;
}

interface PricingRule {
  apply(context: PricingContext): Promise<PricingContext>;
}
```

Usa:

- **eventos** para efectos posteriores;
- **policies/pipelines** para modificar decisiones o cálculos;
- **decorators/middleware** para concerns transversales;
- **feature flags** para comportamiento configurable.

### Regla importante

Los listeners no deberían modificar silenciosamente una entidad ya persistida dentro de otro módulo. Para integridad:

```text
comando
  → dominio
  → persistencia
  → outbox
  → listeners asíncronos
```

---

## 2.3 Plugins y extensibilidad

WordPress carga plugins que registran:

- hooks;
- post types;
- taxonomías;
- endpoints;
- cron jobs;
- settings;
- permisos;
- tablas;
- widgets;
- bloques.

En una plataforma propia, un sistema de plugins totalmente dinámico puede ser innecesario. Normalmente basta con módulos bien definidos:

```text
modules/
  catalog/
  pricing/
  promotions/
  inventory/
  tax/
  shipping/
  checkout/
  orders/
  payments/
  customers/
  notifications/
  integrations/
```

Cada módulo expone:

```ts
interface CommerceModule {
  register(container: Container): void;
  registerEventHandlers(bus: EventBus): void;
}
```

---

## 2.4 Persistencia genérica y metadatos

WordPress usa entidades genéricas y EAV:

```text
wp_posts
wp_postmeta
wp_terms
wp_term_taxonomy
wp_term_relationships
```

Ventajas:

- alta extensibilidad;
- casi cualquier plugin puede añadir campos;
- modelo uniforme.

Desventajas:

- joins complejos;
- poca integridad;
- índices deficientes para consultas de negocio;
- muchos valores sin tipo;
- dificultad para transacciones y constraints.

### Recomendación

No copiar `postmeta` como almacén principal.

Usa tablas normalizadas:

```text
products
product_variants
product_prices
inventory_items
categories
product_categories
product_attributes
product_attribute_values
orders
order_lines
payments
shipments
```

Mantén un campo `metadata JSONB` únicamente para extensiones no críticas:

```sql
metadata jsonb not null default '{}'
```

Los campos usados para filtrar, ordenar, calcular o validar deben tener columnas tipadas.

---

## 2.5 Autenticación, roles y capabilities

WordPress separa:

- usuario;
- rol;
- capability;
- nonce para proteger acciones;
- cookies/sesión;
- permission callbacks en REST.

WooCommerce agrega roles como:

- `customer`;
- `shop_manager`.

### Modelo recomendado

Usa RBAC con permisos atómicos:

```text
catalog.read
catalog.write
inventory.read
inventory.adjust
orders.read
orders.update
orders.refund
payments.read
customers.read
settings.write
```

No bases la autorización solo en roles:

```ts
authorize(user, "orders.refund");
```

Para storefront:

- sesión anónima firmada;
- CSRF si usas cookies;
- rate limiting;
- idempotency keys;
- verificación estricta de ownership del carrito/pedido;
- nunca aceptar `customerId` directamente desde el cliente sin comprobarlo.

---

## 2.6 Caché y transients

WordPress posee:

- object cache por request;
- persistent object cache mediante drop-in;
- transients con expiración;
- caché de consultas y objetos;
- invalidaciones manuales.

WooCommerce también mantiene lookup tables para acelerar lectura.

### Equivalencia moderna

Usa tres niveles:

```text
L1: memoización por request
L2: cache distribuido Redis
L3: proyección materializada / tabla lookup
```

Clasifica datos:

| Dato | Estrategia |
|---|---|
| página de categoría | cache por tag |
| detalle de producto | cache por product ID |
| stock | lectura fuerte o TTL muy corto |
| carrito | no cachear como contenido público |
| checkout | nunca cachear |
| pedido del cliente | privado, no cache compartido |
| configuración | cache prolongado con invalidación |
| facetas/búsqueda | índice especializado |

Eventos de invalidación:

```text
ProductUpdated
PriceChanged
StockChanged
CategoryUpdated
PromotionChanged
```

---

## 2.7 WP-Cron y Action Scheduler

WP-Cron es disparado por tráfico y no garantiza ejecución exacta. WooCommerce usa Action Scheduler como cola persistente con:

- acciones pendientes;
- fecha programada;
- grupos;
- claims;
- reintentos;
- logs;
- acciones recurrentes.

### Equivalencia Next.js

No ejecutar trabajos pesados dentro del request:

```text
Route Handler
  → transacción
  → outbox
  → respuesta
Worker
  → reclama job
  → procesa
  → registra intento
  → reintenta con backoff
```

Opciones:

- BullMQ + Redis;
- Temporal;
- Inngest;
- Trigger.dev;
- AWS SQS;
- RabbitMQ;
- PostgreSQL job queue.

Campos mínimos de job:

```text
id
type
payload
status
attempts
max_attempts
run_at
locked_at
locked_by
last_error
created_at
completed_at
```

---

# 3. Núcleo funcional de WooCommerce

## 3.1 Objetos CRUD y Data Stores

WooCommerce no obliga a la entidad a conocer la tabla.

```text
WC_Product
  → WC_Data_Store
    → product data store
      → posts/postmeta/lookup
```

```text
WC_Order
  → OrdersTableDataStore
    → HPOS tables
```

La entidad:

- define propiedades;
- valida setters;
- rastrea cambios;
- expone getters;
- guarda mediante un data store;
- dispara lifecycle events.

### Equivalencia

```ts
class Product {
  private changes = new Set<string>();

  changePrice(price: Money) {
    this.price = price;
    this.changes.add("price");
  }
}

interface ProductRepository {
  findById(id: ProductId): Promise<Product | null>;
  save(product: Product): Promise<void>;
}
```

Separar:

```text
Domain Entity ≠ ORM Model ≠ API DTO
```

---

## 3.2 Catálogo y tipos de producto

WooCommerce modela productos mediante polimorfismo:

```text
WC_Product
├── Simple
├── Variable
├── Variation
├── Grouped
├── External
└── otros tipos por extensiones
```

### Producto simple

Una unidad comercial directamente comprable.

### Producto variable

Contenedor de variaciones. No se compra sin resolver una variación.

### Variación

Combinación concreta de atributos:

```text
Camiseta
  ├── Negro / M
  ├── Negro / L
  └── Blanco / M
```

Cada variación puede tener:

- SKU;
- precio;
- stock;
- peso;
- dimensiones;
- imagen;
- estado;
- clase fiscal.

### Modelo recomendado

```text
Product
  id
  type
  status
  title
  description
  tax_category_id
  shipping_profile_id

ProductVariant
  id
  product_id
  sku
  status
  price
  compare_at_price
  stock_policy
  weight
  dimensions

VariantOption
  variant_id
  option_value_id
```

No usar una cadena JSON como única fuente de atributos si debes buscar combinaciones.

---

## 3.3 Regla de purchasability

Antes de comprar, WooCommerce verifica conceptualmente:

```text
producto existe
AND estado permitido
AND no está en papelera
AND tipo es comprable
AND precio válido
AND variación válida
AND atributos requeridos presentes
AND stock disponible o backorder permitido
AND cantidad válida
AND restricciones de "sold individually"
AND filtros/extensiones autorizan
```

Implementación recomendada:

```ts
type PurchaseViolation =
  | "NOT_FOUND"
  | "NOT_ACTIVE"
  | "NOT_PURCHASABLE"
  | "VARIANT_REQUIRED"
  | "INVALID_VARIANT"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "QUANTITY_NOT_ALLOWED";

interface PurchasePolicy {
  validate(input: PurchaseInput): Promise<PurchaseViolation[]>;
}
```

El frontend puede anticipar reglas, pero el backend siempre revalida.

---

## 3.4 Identidad de una línea del carrito

WooCommerce genera una clave según:

```text
product_id
+ variation_id
+ atributos seleccionados
+ datos personalizados
```

Luego aplica un hash.

Esto evita mezclar:

```text
Camiseta negra M
Camiseta negra L
Camiseta negra M con personalización distinta
```

### Recomendación

Canonicaliza el payload antes de hashearlo:

```ts
lineKey = sha256(
  canonicalJson({
    productId,
    variantId,
    options,
    customization,
  })
);
```

Nunca incluyas precio enviado por el navegador en la identidad ni en el cálculo.

---

## 3.5 Sesión y carrito

WooCommerce maneja un carrito mutable asociado a:

- sesión anónima;
- usuario autenticado;
- cookie;
- Cart Token para Store API.

El carrito contiene:

```text
items
removed_items
applied_coupons
customer/address context
chosen_shipping_methods
fees
totals
```

### Estado recomendado

```ts
interface Cart {
  id: string;
  customerId?: string;
  status: "ACTIVE" | "CONVERTED" | "ABANDONED" | "EXPIRED";
  currency: string;
  items: CartItem[];
  couponCodes: string[];
  shippingAddress?: Address;
  billingAddress?: Address;
  selectedShippingRateId?: string;
  version: number;
  expiresAt: Date;
}
```

El campo `version` permite optimistic locking.

---

## 3.6 Flujo completo: agregar al carrito

WooCommerce realiza aproximadamente:

```text
1. normalizar product_id, variation_id y cantidad
2. cargar producto/variación
3. resolver parent y variación
4. verificar atributos obligatorios
5. comprobar que la variación pertenece al producto
6. aplicar extensiones a cart_item_data
7. generar line key
8. verificar sold individually
9. verificar purchasability
10. verificar stock actual
11. verificar stock considerando cantidades ya presentes
12. agregar línea o incrementar cantidad
13. marcar carrito como cambiado
14. recalcular totales
15. guardar sesión
16. disparar evento add_to_cart
```

### Caso de uso recomendado

```ts
AddCartItemHandler.handle({
  cartId,
  productId,
  variantId,
  quantity,
  options,
  customization,
});
```

Dentro de una transacción lógica:

```text
load cart
load product/variant
validate purchase policy
merge or append line
price cart on server
increment cart version
save cart
publish CartItemAdded
return full cart
```

Al igual que Store API, devuelve el carrito completo actualizado, no solo “OK”.

---

# 4. Motor de precios y totales

## 4.1 Regla fundamental

El servidor es la única autoridad sobre:

- precio;
- descuento;
- impuesto;
- envío;
- fee;
- total;
- moneda.

El cliente envía intención, no valores monetarios.

---

## 4.2 Dinero y precisión

WooCommerce aumenta precisión internamente y evita redondear demasiado pronto.

### Modelo recomendado

Usar entero en minor units:

```text
PYG: 100000
USD: 1999 representa 19.99
```

O decimal exacto en la base:

```sql
numeric(26, 8)
```

Nunca usar `number` de JavaScript para operaciones financieras sensibles sin una capa decimal.

Reglas:

1. definir minor units por moneda;
2. redondear en puntos explícitos;
3. conservar importes por línea;
4. conservar impuestos por tasa;
5. no reconstruir un pedido histórico usando precios actuales.

---

## 4.3 Pipeline de cálculo

El orden funcional de WooCommerce es:

```text
1. cargar y normalizar líneas
2. calcular subtotales antes de descuentos
3. validar y aplicar cupones/descuentos
4. calcular total de líneas después de descuentos
5. calcular impuestos de líneas
6. calcular shipping
7. calcular impuestos de shipping
8. calcular fees
9. calcular impuestos de fees
10. consolidar impuestos
11. calcular total final
```

Modelo:

```text
subtotal = Σ base line subtotals

discount_total = Σ discounts

items_total = subtotal - discount_total

total =
    items_total
  + item_tax
  + shipping_total
  + shipping_tax
  + fee_total
  + fee_tax
```

El tratamiento exacto cambia según:

- precios incluyen impuestos;
- ubicación fiscal;
- cliente exento;
- impuestos compuestos;
- redondeo por línea o subtotal;
- cupones antes/después de impuesto.

---

## 4.4 Snapshot de precio

El carrito debe recalcular con datos actuales. El pedido debe congelar:

```text
product_id
variant_id
sku
name
quantity
unit_price
subtotal
discount_total
tax_total
total
tax_lines
metadata
```

Aunque el producto cambie después, el pedido conserva su snapshot.

---

# 5. Promociones y cupones

## 5.1 Tipos de descuento

WooCommerce soporta conceptualmente:

- porcentaje;
- importe fijo del carrito;
- importe fijo por producto;
- free shipping;
- restricciones de productos/categorías;
- mínimo/máximo de gasto;
- exclusión de sale items;
- uso total;
- uso por cliente;
- uso por ítem;
- expiración;
- email permitido.

### Modelo recomendado

Separar:

```text
Promotion
CouponCode
PromotionRule
PromotionAction
CouponRedemption
```

Ejemplo:

```json
{
  "conditions": [
    {"type": "MIN_SUBTOTAL", "amount": "500000"},
    {"type": "CUSTOMER_SEGMENT", "value": "VIP"}
  ],
  "actions": [
    {"type": "PERCENT_OFF", "value": "10"}
  ]
}
```

---

## 5.2 Flujo de aplicación

```text
normalizar código
→ cargar cupón/promoción
→ validar estado y fechas
→ validar límites globales
→ validar límites del cliente
→ validar mínimo/máximo
→ determinar líneas elegibles
→ calcular asignación
→ limitar para no producir importes negativos
→ calcular impacto fiscal
→ guardar desglose
```

### Reserva de uso

WooCommerce puede “hold” el uso de cupones durante checkout.

En una plataforma propia:

```text
coupon_reservations
  coupon_id
  cart_id/order_id
  customer_key
  expires_at
```

Esto evita exceder un límite bajo concurrencia.

---

# 6. Impuestos

## 6.1 Contexto fiscal

La tasa puede depender de:

- país;
- estado/departamento;
- ciudad;
- código postal;
- dirección de facturación;
- dirección de envío;
- base de la tienda;
- tipo de producto;
- tipo de envío;
- exención del cliente.

### Modelo

```ts
interface TaxContext {
  customerId?: string;
  origin: Address;
  destination: Address;
  productTaxCategory: string;
  pricesIncludeTax: boolean;
  customerTaxExempt: boolean;
}
```

---

## 6.2 Tasas y líneas de impuesto

No guardar solo un `taxTotal`.

Guardar:

```text
TaxLine
  rate_id
  name
  rate
  compound
  item_tax
  shipping_tax
  total
```

Esto permite:

- facturación;
- auditoría;
- reembolsos parciales;
- reportes;
- cambios regulatorios sin alterar pedidos históricos.

---

## 6.3 Paraguay

Para un e-Commerce paraguayo conviene modelar desde el inicio:

- IVA 10%;
- IVA 5%;
- exentas;
- distribución por línea;
- redondeo compatible con moneda PYG;
- datos necesarios para factura electrónica;
- naturaleza fiscal del descuento;
- timbrado y CDC fuera del agregado de pedido, en un módulo fiscal.

No mezcles la emisión electrónica dentro del cálculo de carrito. Usa:

```text
OrderPaid
  → FiscalDocumentRequested
  → SIFEN/Facturación integration
  → FiscalDocumentIssued | FiscalDocumentFailed
```

---

# 7. Envíos

## 7.1 Packages

WooCommerce agrupa productos en paquetes y calcula rates por paquete.

Un package contiene:

```text
items
value
destination
shipping classes
origin/warehouse
```

Una compra podría generar:

```text
Package 1: depósito Asunción
Package 2: proveedor externo
```

---

## 7.2 Shipping zones y methods

Flujo:

```text
crear packages
→ encontrar zona aplicable
→ cargar métodos habilitados
→ cada método calcula rates
→ filtrar rates
→ cliente elige rate
→ recalcular total
```

### Interfaces

```ts
interface ShippingProvider {
  quote(request: ShippingQuoteRequest): Promise<ShippingRate[]>;
}

interface ShippingRate {
  id: string;
  provider: string;
  service: string;
  amount: Money;
  taxAmount: Money;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  expiresAt?: Date;
}
```

La selección debe revalidarse en checkout porque una cotización puede expirar.

---

# 8. Inventario

## 8.1 Estados

Separar:

```text
on_hand
reserved
available = on_hand - reserved
```

WooCommerce históricamente valida stock en carrito y también reserva stock en checkout/pedidos pendientes.

---

## 8.2 Validación de carrito

```text
quantity_requested <= available
OR backorders_allowed
```

Debe considerar la cantidad ya presente en el mismo carrito.

---

## 8.3 Reserva

Flujo recomendado:

```text
checkout iniciado
→ bloquear filas de inventario
→ validar available
→ crear reservations con TTL
→ crear order/payment attempt
→ commit
```

SQL conceptual:

```sql
SELECT *
FROM inventory_items
WHERE variant_id IN (...)
FOR UPDATE;
```

Luego:

```text
available suficiente
→ aumentar reserved
→ crear inventory_reservations
```

---

## 8.4 Confirmación y liberación

```text
PaymentCaptured
  → reserved -= qty
  → on_hand -= qty
  → reservation = CONSUMED

PaymentFailed/Expired/Cancelled
  → reserved -= qty
  → reservation = RELEASED
```

Usa un identificador idempotente por línea:

```text
inventory_operation(orderId, orderLineId, type)
UNIQUE
```

WooCommerce marca por línea cuánto stock ya redujo para no repetir la operación. Debes conservar la misma propiedad idempotente.

---

## 8.5 Backorders

Estados recomendados:

```text
DENY
ALLOW
ALLOW_AND_NOTIFY
```

No confundas stock negativo con error de infraestructura.

---

# 9. Checkout

## 9.1 Checkout no es una pantalla

Es una orquestación transaccional:

```text
validate cart
validate customer
validate addresses
validate promotions
reprice
validate shipping
reserve inventory
create order snapshot
create payment attempt
process/redirect payment
publish events
```

---

## 9.2 Revalidación obligatoria

Antes de crear el pedido:

```text
carrito no vacío
productos activos
variaciones válidas
precios actuales
stock actual
cupones aún válidos
dirección válida
shipping rate aún válido
payment method disponible
moneda consistente
total no manipulado
```

El total presentado por el navegador puede enviarse como `expectedTotal`, pero solo para detectar cambios:

```text
if expectedTotal != authoritativeTotal
  return CART_CHANGED
```

---

## 9.3 Reanudación de pedido

WooCommerce puede reutilizar un pedido pendiente si:

```text
mismo cart hash
AND estado pending/failed
```

En tu sistema usa:

```text
checkout_session
cart_version
pricing_hash
order_id
expires_at
```

Si el carrito cambió, crea una nueva versión o invalida el checkout anterior.

---

## 9.4 Idempotencia

Toda creación de pedido debe aceptar:

```http
Idempotency-Key: uuid
```

Tabla:

```text
idempotency_keys
  key
  scope
  request_hash
  response_status
  response_body
  resource_id
  expires_at
```

Reglas:

- misma key + mismo request → devolver resultado previo;
- misma key + request diferente → error;
- callback de pago duplicado → no duplicar captura ni transición.

---

## 9.5 Creación del pedido

Orden recomendado:

```text
BEGIN

1. verificar idempotency key
2. cargar cart con optimistic lock
3. recalcular authoritative quote
4. reservar inventario
5. crear order header
6. copiar addresses
7. copiar line items
8. copiar discounts
9. copiar shipping lines
10. copiar tax lines
11. crear payment attempt
12. marcar cart como converted
13. insertar outbox events
14. guardar idempotency result

COMMIT
```

No enviar email ni webhook antes del commit.

---

# 10. Pagos

## 10.1 Payment Gateway como port

WooCommerce usa clases gateway con métodos de disponibilidad y `process_payment`.

Modelo moderno:

```ts
interface PaymentGateway {
  id: string;
  supports(context: PaymentContext): Promise<boolean>;
  createPayment(input: CreatePaymentInput): Promise<PaymentIntent>;
  capture(input: CapturePaymentInput): Promise<PaymentResult>;
  refund(input: RefundPaymentInput): Promise<RefundResult>;
  parseWebhook(request: RawWebhookRequest): Promise<GatewayEvent>;
}
```

---

## 10.2 Payment Attempt

No guardar solo campos de pago en el pedido.

```text
PaymentAttempt
  id
  order_id
  gateway
  status
  amount
  currency
  external_id
  idempotency_key
  failure_code
  failure_message
  created_at
  updated_at
```

Estados:

```text
CREATED
REQUIRES_ACTION
PROCESSING
AUTHORIZED
CAPTURED
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

---

## 10.3 Webhook de pago

```text
receive raw request
→ verify signature
→ parse external event
→ deduplicate event ID
→ load payment attempt/order
→ validate amount/currency/reference
→ apply state transition
→ insert outbox events
→ commit
→ return 2xx
```

Tabla:

```text
webhook_receipts
  provider
  external_event_id
  payload_hash
  received_at
  processed_at
  status
  error
UNIQUE(provider, external_event_id)
```

---

## 10.4 Payment complete

WooCommerce:

- registra transaction ID;
- registra fecha de pago;
- cambia normalmente a `processing` o `completed`;
- dispara eventos;
- reduce stock mediante listeners;
- registra ventas.

En tu diseño conviene separar:

```text
payment_status = CAPTURED
order_status = CONFIRMED
fulfillment_status = UNFULFILLED
```

No usar un único status para tres procesos diferentes.

---

# 11. Pedido y máquinas de estado

## 11.1 WooCommerce

Estados habituales:

```text
pending
processing
on-hold
completed
cancelled
refunded
failed
checkout-draft
```

Este modelo mezcla:

- pago;
- operación;
- fulfillment;
- devolución.

---

## 11.2 Modelo recomendado

### Order status

```text
DRAFT
PLACED
CONFIRMED
CANCELLED
CLOSED
```

### Payment status

```text
UNPAID
PENDING
AUTHORIZED
PAID
PARTIALLY_REFUNDED
REFUNDED
FAILED
```

### Fulfillment status

```text
UNFULFILLED
PROCESSING
PARTIALLY_FULFILLED
FULFILLED
RETURNED
```

### Fiscal status

```text
NOT_REQUIRED
PENDING
ISSUED
FAILED
CANCELLED
```

---

## 11.3 Transiciones

Ejemplo:

```text
DRAFT → PLACED
PLACED → CONFIRMED
PLACED → CANCELLED
CONFIRMED → CANCELLED, bajo política
CONFIRMED → CLOSED, cuando fulfillment finaliza
```

Cada transición debe:

1. validar estado origen;
2. validar permisos;
3. validar invariantes;
4. registrar fecha/actor;
5. generar evento;
6. ser idempotente.

---

## 11.4 Timeline / order notes

WooCommerce registra notas de pedido.

Modelo:

```text
OrderTimelineEntry
  id
  order_id
  type
  visibility: INTERNAL | CUSTOMER
  message
  metadata
  actor_type
  actor_id
  created_at
```

No utilizar logs técnicos como notas para clientes.

---

# 12. Reembolsos

## 12.1 Refund como entidad

Un reembolso no debería ser solo un número negativo.

```text
Refund
  id
  order_id
  status
  amount
  currency
  reason
  gateway_refund_id
  created_by
```

```text
RefundLine
  order_line_id
  quantity
  subtotal
  tax
  restock
```

---

## 12.2 Flujo

```text
validate refundable amount
→ validate line quantities
→ create refund pending
→ call gateway
→ update refund
→ optionally restore stock
→ update payment status
→ emit RefundCompleted
```

No restaurar stock automáticamente en todos los casos; debe ser una decisión explícita.

---

# 13. Eventos, emails y webhooks

## 13.1 Eventos importantes

```text
ProductCreated
ProductUpdated
ProductDeleted
PriceChanged
StockChanged
CustomerRegistered
CartItemAdded
CartUpdated
CheckoutStarted
OrderPlaced
OrderConfirmed
OrderCancelled
PaymentCaptured
PaymentFailed
RefundCompleted
ShipmentCreated
ShipmentFulfilled
FiscalDocumentIssued
```

---

## 13.2 Transactional outbox

Tabla:

```text
outbox_events
  id
  aggregate_type
  aggregate_id
  event_type
  payload
  occurred_at
  available_at
  attempts
  processed_at
  last_error
```

Flujo:

```text
transacción de negocio
  → guarda entidad
  → guarda evento outbox
COMMIT

worker
  → publica/procesa
```

Esto evita:

```text
pedido guardado pero email no enviado
email enviado pero pedido rollback
webhook perdido
doble descuento de stock
```

---

## 13.3 Webhooks salientes

Cada endpoint configurado debe tener:

```text
WebhookSubscription
WebhookDelivery
```

`WebhookDelivery`:

```text
id
subscription_id
event_id
attempt
request_body
response_status
response_body_excerpt
duration_ms
next_attempt_at
status
```

Firma recomendada:

```text
HMAC-SHA256(secret, rawBody)
```

Incluye:

```http
X-Event-Id
X-Event-Type
X-Signature
X-Attempt
```

---

# 14. Proyecciones y tablas lookup

WooCommerce crea tablas derivadas para:

- filtros de producto;
- SKU y stock;
- atributos;
- analítica de pedidos;
- clientes;
- impuestos;
- cupones.

Conceptualmente implementa CQRS ligero:

```text
write model → events/hooks → read model
```

### En tu plataforma

Usa:

```text
product_search_projection
category_facets
sales_daily
customer_metrics
inventory_availability
```

Estas tablas/índices pueden reconstruirse.

No uses una proyección como autoridad para cobrar o reservar stock.

---

# 15. Store API y frontend

WooCommerce separa:

- REST API autenticada para administración;
- Store API para storefront;
- Cart Store;
- Checkout Store;
- Validation Store.

### Next.js

```text
Server Components
  → lectura de catálogo

Client Components
  → interacción de carrito/checkout

Route Handlers
  → BFF de storefront

Admin API
  → endpoints separados y autorización fuerte
```

Endpoints mínimos:

```text
GET    /api/store/products
GET    /api/store/products/:slug
GET    /api/store/cart
POST   /api/store/cart/items
PATCH  /api/store/cart/items/:lineId
DELETE /api/store/cart/items/:lineId
POST   /api/store/cart/coupons
POST   /api/store/cart/address
POST   /api/store/shipping/quote
POST   /api/store/checkout
POST   /api/store/payments/:gateway/webhook
GET    /api/store/orders/:id
```

La API de carrito debe retornar el carrito completo después de cada mutación.

---

# 16. Arquitectura recomendada para Next.js

## 16.1 Modular monolith

Comienza con un monolito modular, no con microservicios.

```text
src/
  app/
  modules/
    catalog/
      domain/
      application/
      infrastructure/
      presentation/
    cart/
    pricing/
    promotions/
    inventory/
    tax/
    shipping/
    checkout/
    orders/
    payments/
    customers/
    notifications/
  shared/
    domain/
    application/
    infrastructure/
```

Puede escalar y permite extraer módulos luego.

---

## 16.2 Capas

### Domain

- entidades;
- value objects;
- invariantes;
- políticas;
- eventos;
- state machines.

### Application

- casos de uso;
- coordinación;
- transacciones;
- autorización;
- idempotencia.

### Infrastructure

- Prisma/Drizzle/SQL;
- Redis;
- gateways;
- queues;
- email;
- almacenamiento.

### Presentation

- Route Handlers;
- Server Actions;
- DTOs;
- schemas;
- serializers.

---

## 16.3 Patrón por caso de uso

```ts
export class AddCartItem {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: ProductRepository,
    private readonly purchasePolicy: PurchasePolicy,
    private readonly pricing: PricingEngine,
    private readonly tx: TransactionManager,
  ) {}

  async execute(command: AddCartItemCommand): Promise<CartDto> {
    return this.tx.run(async () => {
      const cart = await this.carts.getRequired(command.cartId);
      const variant = await this.catalog.getPurchasableVariant(
        command.productId,
        command.variantId,
      );

      await this.purchasePolicy.assertCanAdd({
        cart,
        variant,
        quantity: command.quantity,
      });

      cart.addItem(variant, command.quantity, command.options);
      await this.pricing.recalculate(cart);
      await this.carts.save(cart);

      return CartDto.from(cart);
    });
  }
}
```

---

# 17. Esquema mínimo recomendado

```text
users
roles
permissions
user_roles
role_permissions

products
product_variants
product_options
product_option_values
variant_option_values
categories
product_categories
prices
inventory_items
inventory_movements
inventory_reservations

customers
customer_addresses

carts
cart_items
cart_coupons

promotions
coupon_codes
coupon_redemptions
coupon_reservations

shipping_zones
shipping_methods
shipping_rates

tax_categories
tax_rates

orders
order_addresses
order_lines
order_discounts
order_shipping_lines
order_tax_lines
order_timeline

payment_attempts
payment_transactions
refunds
refund_lines

outbox_events
webhook_subscriptions
webhook_deliveries
webhook_receipts
idempotency_keys
jobs
```

---

# 18. Flujo de extremo a extremo

## 18.1 Navegación

```text
GET product
→ read projection/cache
→ product DTO
→ Server Component render
```

## 18.2 Add to cart

```text
POST item
→ validate session
→ load authoritative product
→ purchase policy
→ cart mutation
→ pricing pipeline
→ save
→ return full cart
```

## 18.3 Dirección

```text
update address
→ recompute taxes
→ recompute shipping packages/rates
→ invalidate selected rate if no longer valid
→ return cart
```

## 18.4 Cupón

```text
apply code
→ validate
→ reserve usage if needed
→ price cart
→ return discount breakdown
```

## 18.5 Checkout

```text
idempotency
→ revalidate cart
→ recalculate
→ reserve stock
→ snapshot order
→ create payment attempt
→ commit
→ initiate payment
```

## 18.6 Pago confirmado

```text
gateway webhook
→ signature
→ deduplication
→ capture state
→ order confirmation
→ consume stock reservation
→ outbox:
    OrderConfirmed
    PaymentCaptured
    SendOrderEmail
    EmitWebhook
    RequestFiscalDocument
```

## 18.7 Cancelación

```text
authorize
→ validate transition
→ cancel payment if possible
→ release/restore stock
→ release coupon reservation
→ cancel order
→ outbox
```

---

# 19. Errores de diseño que debes evitar

1. Consultar el ORM directamente desde componentes React.
2. Poner reglas de precios en el frontend.
3. Guardar dinero como `float`.
4. Crear pedido sin idempotency key.
5. Descontar stock sin lock o constraint.
6. Enviar email antes del commit.
7. Usar un solo campo `status` para pedido, pago y envío.
8. Sobrescribir líneas históricas cuando cambia el producto.
9. Usar Redis como única persistencia del carrito sin estrategia de recuperación.
10. Confiar en callbacks de pago sin deduplicación.
11. Ejecutar reindexado pesado dentro del request.
12. Hacer side effects dentro de “filters” o reglas de precio.
13. Exponer modelos ORM como respuesta pública.
14. Usar metadata JSON para campos críticos.
15. No registrar por qué cambió el stock.
16. No versionar carrito y promociones.
17. No distinguir autorización de pago y captura.
18. No verificar moneda y monto en webhooks.
19. Depender de cache para consistencia de inventario.
20. Intentar copiar todos los hooks de WooCommerce antes de conocer tus casos reales.

---

# 20. Mejoras sobre WooCommerce

Puedes conservar sus fortalezas y corregir sus limitaciones:

| WooCommerce | Diseño recomendado |
|---|---|
| Hooks globales | Eventos tipados |
| Filters dinámicos | Policies/pipelines explícitos |
| `posts/postmeta` | Esquema tipado |
| CRUD + Data Store | Entidad + Repository |
| Cart Session | Cart agregado versionado |
| Status único | Estados separados |
| Action Scheduler | Queue + outbox |
| Lookup tables | Proyecciones reconstruibles |
| Order notes | Timeline tipada |
| Meta keys | Columnas + metadata secundaria |
| Stock flags | Ledger + reservations |
| Nonces/Cart Token | Sesión firmada + CSRF + token |
| PHP callbacks | Workers idempotentes |

---

# 21. Orden recomendado de implementación

## Fase 1: Foundations

- Money;
- IDs;
- Result/Error;
- Event Bus;
- Transaction Manager;
- Outbox;
- Idempotency;
- Auth/RBAC.

## Fase 2: Catalog

- productos;
- variantes;
- categorías;
- atributos;
- imágenes;
- precios;
- búsqueda.

## Fase 3: Cart + pricing

- sesión;
- cart;
- purchase policy;
- pricing engine;
- impuestos;
- promociones;
- shipping quote.

## Fase 4: Inventory

- stock;
- movements;
- reservations;
- concurrency;
- low stock events.

## Fase 5: Checkout + orders

- validación;
- snapshots;
- estados;
- timeline;
- email.

## Fase 6: Payments

- gateway port;
- intent/attempt;
- webhooks;
- refunds;
- reconciliation.

## Fase 7: Integrations

- ERP;
- facturación;
- webhooks;
- reindexado;
- analytics;
- scheduled jobs.

---

# 22. Matriz de pruebas obligatoria

## Carrito

- producto inexistente;
- producto inactivo;
- variable sin variante;
- variante ajena al producto;
- atributo faltante;
- sold individually;
- stock insuficiente;
- stock compartido por parent;
- dos líneas con personalización distinta;
- incremento de línea existente.

## Precios

- precio regular;
- precio promocional;
- porcentaje;
- descuento fijo;
- múltiples cupones;
- mínimo de compra;
- descuento mayor que subtotal;
- impuestos incluidos/excluidos;
- redondeo;
- moneda sin decimales.

## Inventario

- dos checkouts concurrentes;
- reserva expirada;
- pago duplicado;
- cancelación duplicada;
- backorder;
- restauración parcial;
- variante con stock propio;
- variante con stock del padre.

## Checkout

- carrito modificado;
- shipping quote expirado;
- cupón agotado;
- webhook antes del redirect;
- webhook duplicado;
- timeout del gateway;
- reintento con misma idempotency key;
- pedido guest;
- pedido autenticado.

## Pedidos

- pago capturado;
- pago fallido;
- cancelación;
- refund parcial;
- refund total;
- cambio inválido de estado;
- email fallido sin rollback;
- webhook saliente fallido con retry.

---

# 23. Fuentes de estudio del Core

Documentación oficial consultada:

- WordPress Plugin Handbook: Hooks, Actions y Filters.
- WordPress REST API Overview.
- WordPress Object Cache.
- WooCommerce CRUD Objects.
- WooCommerce Store API, Cart API y Checkout API.
- WooCommerce HPOS.
- WooCommerce Payment Gateway API.
- WooCommerce Shipping Method API.
- WooCommerce Webhooks.
- Action Scheduler documentation.

Archivos de Core especialmente útiles:

```text
WordPress:
  wp-settings.php
  wp-includes/plugin.php
  wp-includes/class-wp-hook.php
  wp-includes/rest-api/
  wp-includes/class-wp-query.php
  wp-includes/cache.php

WooCommerce:
  includes/abstracts/abstract-wc-data.php
  includes/class-wc-data-store.php
  includes/abstracts/abstract-wc-product.php
  includes/class-wc-cart.php
  includes/class-wc-cart-session.php
  includes/class-wc-cart-totals.php
  includes/class-wc-discounts.php
  includes/class-wc-tax.php
  includes/class-wc-shipping.php
  includes/class-wc-checkout.php
  includes/class-wc-order.php
  includes/wc-stock-functions.php
  src/Internal/DataStores/Orders/OrdersTableDataStore.php
  src/StoreApi/
```

---

# 24. Conclusión arquitectónica

La esencia del Core de WordPress + WooCommerce no es PHP ni sus tablas. Es esta secuencia:

```text
configuración
→ extensibilidad
→ objeto de dominio
→ validación
→ persistencia abstraída
→ evento
→ proyección
→ side effects asíncronos
```

Para tu Next.js, la arquitectura recomendada es:

```text
Next.js storefront/BFF
+ modular monolith
+ dominio tipado
+ PostgreSQL
+ Redis
+ queue
+ transactional outbox
+ idempotency
+ inventory reservations
+ payment attempts
+ read projections
```

Esa combinación reproduce la capacidad funcional de WooCommerce, pero con mejor tipado, consistencia transaccional, rendimiento y mantenibilidad.
