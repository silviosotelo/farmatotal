# Nuevo DB Schema — Diseño desde cero

**Principio:** Simple, consistente, multi-tenant, extensible via metadata. Inspirado en WP pero moderno.

---

## Reglas del schema

1. **Toda tabla tiene `tenant_id`** (UUID, FK a tenants). Sin excepciones.
2. **Toda PK es `UUID`** con `DEFAULT gen_random_uuid()`. Sin excepciones.
3. **Toda FK es `UUID`**. Sin varchar, sin integer, sin mezclas.
4. **Toda tabla tiene `created_at`** y `updated_at` (TIMESTAMPTZ).
5. **Metadata via tablas `*_meta`** — key-valueTEXT, permite plugins sin migraciones.
6. **JSONB solo para datos estructurados anidados** (schedule, events, config) — no como dumping ground.
7. **Nombres en snake_case**, sin prefijos de app.
8. **Soft delete via `deleted_at`** en entidades principales (products, orders, customers, branches).
9. **Schema PostgreSQL:** `app.*`

---

## Capa 0: Multi-tenant

### `tenants`
```
id          UUID PK
slug        VARCHAR(120) UNIQUE NOT NULL
name        VARCHAR(200) NOT NULL
domain      VARCHAR(250) UNIQUE
config      JSONB NOT NULL DEFAULT '{}'     -- flags, theme, currency, locale
active      BOOLEAN NOT NULL DEFAULT true
deleted_at  TIMESTAMPTZ
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `tenant_meta`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT
```
INDEX (tenant_id, meta_key)

---

## Capa 1: Contenido (WP-style posts + postmeta)

### `posts`
Entidad universal: products, pages, slides, cms_pages, blog_posts, etc.

```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
type          VARCHAR(50) NOT NULL          -- 'product', 'page', 'slide', 'blog_post'
status        VARCHAR(30) NOT NULL DEFAULT 'published'  -- draft/published/archived/trash
title         VARCHAR(300) NOT NULL
slug          VARCHAR(250) NOT NULL
content       TEXT                          -- descripción / contenido principal
excerpt       TEXT                          -- descripción corta
parent_id     UUID FK→posts SET NULL
author_id     UUID FK→users SET NULL
sort_order    INTEGER NOT NULL DEFAULT 0
source_id     VARCHAR(80)                   -- ID externo (ERP/Woo)
source_system VARCHAR(40)                   -- 'woo', 'erp', 'manual'
synced_at     TIMESTAMPTZ
deleted_at    TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, type, slug)
INDEX (tenant_id, type, status)
INDEX (parent_id)
INDEX (tenant_id, source_system, source_id) WHERE source_system IS NOT NULL

### `post_meta`
Metadata flexible de posts. Plugins pueden agregar campos sin migrar.

```
id          UUID PK
post_id     UUID NOT NULL FK→posts CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT
```
INDEX (post_id, meta_key)
INDEX (meta_key)

---

## Capa 2: Taxonomía (WP-style terms)

### `terms`
Categorías, marcas, tags, atributos — todo en una tabla.

```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
taxonomy      VARCHAR(50) NOT NULL          -- 'product_cat', 'product_brand', 'product_tag', 'pa_color'
name          VARCHAR(200) NOT NULL
slug          VARCHAR(200) NOT NULL
parent_id     UUID FK→terms SET NULL
description  TEXT
sort_order    INTEGER NOT NULL DEFAULT 0
count         INTEGER NOT NULL DEFAULT 0    -- cache de cuántos posts usa este term
source_id     VARCHAR(80)
source_system VARCHAR(40)
deleted_at    TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, taxonomy, slug)
INDEX (tenant_id, taxonomy)
INDEX (parent_id)

### `term_meta`
```
id          UUID PK
term_id     UUID NOT NULL FK→terms CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT
```
INDEX (term_id, meta_key)

### `term_relationships`
Relación post↔term (un post puede tener muchos terms, un term muchos posts).

```
post_id     UUID NOT NULL FK→posts CASCADE
term_id     UUID NOT NULL FK→terms CASCADE
sort_order  INTEGER NOT NULL DEFAULT 0
PRIMARY KEY (post_id, term_id)
```

---

## Capa 3: Settings (WP-style options)

### `options`
Reemplaza la tabla `settings`. Key-value por tenant.

```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
option_name  VARCHAR(191) NOT NULL
option_value JSONB                          -- JSON structured value
autoload     BOOLEAN NOT NULL DEFAULT false -- cargar en boot?
```
UNIQUE (tenant_id, option_name)

---

## Capa 4: Users & Customers

### `users`
Admin/staff users. Auth del panel admin.

```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants      -- staff belongs to tenant
email         VARCHAR(254) NOT NULL UNIQUE
name          VARCHAR(120)
password_hash TEXT NOT NULL
role          VARCHAR(20) NOT NULL DEFAULT 'editor'  -- admin/editor/viewer
active        BOOLEAN NOT NULL DEFAULT true
last_login_at TIMESTAMPTZ
deleted_at    TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `user_meta`
```
id          UUID PK
user_id     UUID NOT NULL FK→users CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT
```
INDEX (user_id, meta_key)

### `customers`
Clientes del storefront. Separados de users (staff).

```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
user_id       UUID FK→users SET NULL        -- si tiene cuenta
email         VARCHAR(180)
first_name    VARCHAR(120)
last_name     VARCHAR(120)
razon_social  VARCHAR(200)
doc_type      VARCHAR(8)                    -- 'CI' / 'RUC'
doc_number    VARCHAR(40)
phone         VARCHAR(40)
active        BOOLEAN NOT NULL DEFAULT true
source_id     VARCHAR(60)
source_system VARCHAR(20)
deleted_at    TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id, email)
INDEX (tenant_id, doc_number)
UNIQUE (tenant_id, source_system, source_id) WHERE source_system IS NOT NULL

### `customer_meta`
```
id          UUID PK
customer_id UUID NOT NULL FK→customers CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT
```
INDEX (customer_id, meta_key)

### `addresses`
Direcciones de clientes.

```
id          UUID PK
customer_id UUID NOT NULL FK→customers CASCADE
tenant_id   UUID NOT NULL FK→tenants
type        VARCHAR(20) NOT NULL DEFAULT 'shipping'  -- shipping/billing
first_name  VARCHAR(100)
last_name   VARCHAR(100)
company     VARCHAR(100)
address_1   VARCHAR(255)
address_2   VARCHAR(255)
city        VARCHAR(100)
state       VARCHAR(100)
postcode    VARCHAR(20)
country     VARCHAR(2) DEFAULT 'PY'
phone       VARCHAR(50)
is_default  BOOLEAN NOT NULL DEFAULT false
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (customer_id)

---

## Capa 5: Productos (dedicada + post_meta)

### `products`
Datos específicos de productos. El post tiene el contenido, esta tabla tiene el commerce.

```
id              UUID PK
post_id         UUID NOT NULL FK→posts CASCADE
tenant_id       UUID NOT NULL FK→tenants
sku             VARCHAR(100) NOT NULL
barcode         VARCHAR(40)
cod_interno     VARCHAR(80)
price_normal    INTEGER NOT NULL DEFAULT 0  -- en guaraníes (entero)
price_web       INTEGER NOT NULL DEFAULT 0
on_promo        BOOLEAN NOT NULL DEFAULT false
promo_code      VARCHAR(60)
unit            VARCHAR(20) NOT NULL DEFAULT 'unidad'
unit_step       DOUBLE PRECISION NOT NULL DEFAULT 1
product_type    VARCHAR(10) NOT NULL DEFAULT 'physical'
manage_stock    BOOLEAN NOT NULL DEFAULT true
stock_status    VARCHAR(20) NOT NULL DEFAULT 'instock'
stock_cached    INTEGER NOT NULL DEFAULT 0
weight          DECIMAL(10,2)
length          DECIMAL(10,2)
width           DECIMAL(10,2)
height          DECIMAL(10,2)
controlled      BOOLEAN NOT NULL DEFAULT false
featured        BOOLEAN NOT NULL DEFAULT false
deleted_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, sku)
INDEX (post_id)
INDEX (tenant_id, stock_status)
INDEX (tenant_id, featured)

### `product_images`
```
id          UUID PK
product_id  UUID NOT NULL FK→products CASCADE
url         TEXT NOT NULL
alt         VARCHAR(300)
position    INTEGER NOT NULL DEFAULT 0
is_primary  BOOLEAN NOT NULL DEFAULT false
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (product_id)

### `product_variations`
```
id            UUID PK
product_id    UUID NOT NULL FK→products CASCADE
tenant_id     UUID NOT NULL FK→tenants
sku           VARCHAR(100) NOT NULL
title         VARCHAR(250) NOT NULL
price_normal  INTEGER NOT NULL DEFAULT 0
price_web     INTEGER NOT NULL DEFAULT 0
stock_cached  INTEGER NOT NULL DEFAULT 0
stock_status  VARCHAR(20) NOT NULL DEFAULT 'instock'
manage_stock  BOOLEAN NOT NULL DEFAULT false
image_url     TEXT
position      INTEGER NOT NULL DEFAULT 0
active        BOOLEAN NOT NULL DEFAULT true
attributes    JSONB                         -- {"color":"rojo","size":"L"}
source_id     VARCHAR(80)
source_system VARCHAR(40)
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, sku)
INDEX (product_id)

### `product_specifications`
Ficha técnica estructurada.

```
id          UUID PK
product_id  UUID NOT NULL FK→products CASCADE
group_name  VARCHAR(120) NOT NULL DEFAULT 'General'
label       VARCHAR(200) NOT NULL
value       TEXT NOT NULL
position    INTEGER NOT NULL DEFAULT 0
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (product_id)

---

## Capa 6: Sucursales & Inventario

### `branches`
```
id                    UUID PK
tenant_id             UUID NOT NULL FK→tenants
code                  VARCHAR(40) NOT NULL
erp_code              VARCHAR(20)
name                  VARCHAR(200) NOT NULL
address               TEXT
city                  VARCHAR(120)
phone                 VARCHAR(40)
lat                   DOUBLE PRECISION
lng                   DOUBLE PRECISION
schedule              JSONB
pickup_enabled        BOOLEAN NOT NULL DEFAULT true
delivery_enabled      BOOLEAN NOT NULL DEFAULT false
delivery_cost         DOUBLE PRECISION NOT NULL DEFAULT 0
delivery_radius       DOUBLE PRECISION NOT NULL DEFAULT 0
active                BOOLEAN NOT NULL DEFAULT true
sort_order            INTEGER NOT NULL DEFAULT 0
is_delivery_inventory BOOLEAN NOT NULL DEFAULT false
is_purchasing_warehouse BOOLEAN NOT NULL DEFAULT false
source_id             VARCHAR(80)
source_system         VARCHAR(40)
deleted_at            TIMESTAMPTZ
created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, code)

### `branch_meta`
```
id          UUID PK
branch_id   UUID NOT NULL FK→branches CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT
```
INDEX (branch_id, meta_key)

### `inventory`
Stock por producto×sucursal.

```
product_id  UUID NOT NULL FK→products CASCADE
branch_id   UUID NOT NULL FK→branches CASCADE
tenant_id   UUID NOT NULL FK→tenants
stock       INTEGER NOT NULL DEFAULT 0
reserved    INTEGER NOT NULL DEFAULT 0
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY (product_id, branch_id)
```

### `stock_movements`
Auditoría de movimientos de stock.

```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
product_id    UUID NOT NULL FK→products
branch_id     UUID NOT NULL FK→branches
delta         INTEGER NOT NULL              -- +5 add, -3 reduce
reason        VARCHAR(100) NOT NULL         -- 'order_reduce', 'order_restore', 'manual', 'erp_push'
reference_id  UUID                          -- order_id si aplica
note          TEXT
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id, product_id)
INDEX (tenant_id, branch_id)
INDEX (reference_id)

---

## Capa 7: Pedidos

### `orders`
```
id                UUID PK
tenant_id         UUID NOT NULL FK→tenants
number            VARCHAR(30) NOT NULL UNIQUE
user_id           UUID FK→users SET NULL
customer_id       UUID FK→customers SET NULL
customer_name     VARCHAR(200) NOT NULL
customer_email    VARCHAR(254) NOT NULL
customer_phone    VARCHAR(40)
customer_doc      VARCHAR(40)
status            VARCHAR(30) NOT NULL DEFAULT 'pending'
-- pending/paid/processing/fulfilled/delivered/cancelled/refunded
currency          VARCHAR(3) NOT NULL DEFAULT 'PYG'
shipping_method   VARCHAR(20) NOT NULL      -- pickup/delivery
shipping_address  JSONB
branch_id         UUID FK→branches SET NULL
payment_method    VARCHAR(20) NOT NULL      -- online/cash/transfer
payment_gateway_id UUID FK→payment_gateways SET NULL
subtotal          INTEGER NOT NULL DEFAULT 0
discount_total    INTEGER NOT NULL DEFAULT 0
shipping_total    INTEGER NOT NULL DEFAULT 0
tax_total         INTEGER NOT NULL DEFAULT 0
grand_total       INTEGER NOT NULL DEFAULT 0
coupon_code       VARCHAR(60)
notes             TEXT
events            JSONB NOT NULL DEFAULT '[]'
deleted_at        TIMESTAMPTZ
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id, status)
INDEX (tenant_id, created_at)
INDEX (user_id)
INDEX (customer_email)

### `order_items`
```
id            UUID PK
order_id      UUID NOT NULL FK→orders CASCADE
product_id    UUID FK→products SET NULL
variation_id  UUID FK→product_variations SET NULL
name          VARCHAR(255) NOT NULL
sku           VARCHAR(100)
quantity      DECIMAL(10,2) NOT NULL
unit_price    INTEGER NOT NULL DEFAULT 0
subtotal      INTEGER NOT NULL DEFAULT 0
subtotal_tax  INTEGER NOT NULL DEFAULT 0
total         INTEGER NOT NULL DEFAULT 0
total_tax     INTEGER NOT NULL DEFAULT 0
```
INDEX (order_id)

### `order_meta`
Metadata flexible de pedidos. Plugins pueden agregar campos.

```
id          UUID PK
order_id    UUID NOT NULL FK→orders CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT
```
INDEX (order_id, meta_key)

### `order_taxes`
```
id              UUID PK
order_id        UUID NOT NULL FK→orders CASCADE
tax_rate_id     UUID FK→tax_rates SET NULL
rate_name       VARCHAR(60) NOT NULL
rate_percent    DECIMAL(6,4) NOT NULL
amount          INTEGER NOT NULL DEFAULT 0
shipping_amount INTEGER NOT NULL DEFAULT 0
```
INDEX (order_id)

### `refunds`
```
id          UUID PK
order_id    UUID NOT NULL FK→orders CASCADE
amount      INTEGER NOT NULL
reason      VARCHAR(255)
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (order_id)

### `order_tracking`
```
id              UUID PK
order_id        UUID NOT NULL FK→orders CASCADE
carrier         VARCHAR(120) NOT NULL
tracking_number VARCHAR(200) NOT NULL
tracking_url    TEXT
shipped_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (order_id)

### `order_notes`
Notas internas del pedido.

```
id                  UUID PK
order_id            UUID NOT NULL FK→orders CASCADE
content             TEXT NOT NULL
is_customer_note    BOOLEAN NOT NULL DEFAULT false
author_id           UUID FK→users SET NULL
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (order_id)

---

## Capa 8: Pagos

### `payment_gateways`
Gateways configurados por tenant.

```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
gateway_key VARCHAR(100) NOT NULL          -- 'bancard', 'personalpay', 'tigomoney'
title       VARCHAR(100) NOT NULL
description TEXT
enabled     BOOLEAN NOT NULL DEFAULT false
sort_order  INTEGER NOT NULL DEFAULT 0
is_custom   BOOLEAN NOT NULL DEFAULT false
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, gateway_key)

### `payment_gateway_meta`
Config específica de cada gateway (keys, tokens, etc.). Sensitive fields se filtran en API.

```
id          UUID PK
gateway_id  UUID NOT NULL FK→payment_gateways CASCADE
meta_key    VARCHAR(191) NOT NULL
meta_value  TEXT                           -- se encripta si es sensitive
is_sensitive BOOLEAN NOT NULL DEFAULT false
```
INDEX (gateway_id, meta_key)

### `payments`
Transacciones de pago.

```
id                  UUID PK
order_id            UUID NOT NULL FK→orders CASCADE
tenant_id           UUID NOT NULL FK→tenants
gateway_id          UUID FK→payment_gateways SET NULL
provider            VARCHAR(30) NOT NULL
status              VARCHAR(20) NOT NULL DEFAULT 'pending'
-- pending/approved/rejected/rolled_back
amount              INTEGER NOT NULL
currency            VARCHAR(3) NOT NULL DEFAULT 'PYG'
provider_ref        VARCHAR(120)
authorization_number VARCHAR(40)
ticket_number       VARCHAR(40)
response_code       VARCHAR(10)
response_description VARCHAR(200)
raw_payload         TEXT
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (order_id)
INDEX (tenant_id, status)

---

## Capa 9: Cupones

### `coupons`
```
id                  UUID PK
tenant_id           UUID NOT NULL FK→tenants
code                VARCHAR(60) NOT NULL
description         TEXT
discount_type       VARCHAR(20) NOT NULL DEFAULT 'percent'  -- percent/fixed
amount              INTEGER NOT NULL
expiry_date         TIMESTAMPTZ
usage_limit         INTEGER
usage_limit_per_user INTEGER
minimum_amount      INTEGER
maximum_amount      INTEGER
used_count          INTEGER NOT NULL DEFAULT 0
active              BOOLEAN NOT NULL DEFAULT true
deleted_at          TIMESTAMPTZ
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, code)

### `coupon_usages`
```
id          UUID PK
coupon_id   UUID NOT NULL FK→coupons CASCADE
order_id    UUID NOT NULL FK→orders
user_id     UUID FK→users SET NULL
customer_id UUID FK→customers SET NULL
amount      INTEGER NOT NULL
used_at     TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (coupon_id)

---

## Capa 10: Envío

### `shipping_zones`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
name        VARCHAR(100) NOT NULL
sort_order  INTEGER NOT NULL DEFAULT 0
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `shipping_zone_locations`
```
id            UUID PK
zone_id       UUID NOT NULL FK→shipping_zones CASCADE
location_code VARCHAR(100) NOT NULL      -- city name, state code, country code
location_type VARCHAR(50) NOT NULL       -- 'city', 'state', 'country', 'postcode'
```
INDEX (zone_id)

### `shipping_methods`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
method_key  VARCHAR(100) NOT NULL          -- 'flat_rate', 'free_shipping', 'pickup'
title       VARCHAR(100) NOT NULL
enabled     BOOLEAN NOT NULL DEFAULT true
```
UNIQUE (tenant_id, method_key)

### `shipping_zone_methods`
```
id                 UUID PK
zone_id            UUID NOT NULL FK→shipping_zones CASCADE
shipping_method_id UUID NOT NULL FK→shipping_methods
cost               INTEGER NOT NULL DEFAULT 0
free_from          INTEGER
enabled            BOOLEAN NOT NULL DEFAULT true
sort_order         INTEGER NOT NULL DEFAULT 0
```
INDEX (zone_id)

---

## Capa 11: Impuestos

### `tax_classes`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
name        VARCHAR(100) NOT NULL
slug        VARCHAR(100) NOT NULL
```
UNIQUE (tenant_id, slug)

### `tax_rates`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
tax_class_id UUID FK→tax_classes SET NULL
name        VARCHAR(100) NOT NULL
rate        DECIMAL(6,4) NOT NULL
priority    INTEGER NOT NULL DEFAULT 1
compound    BOOLEAN NOT NULL DEFAULT false
shipping    BOOLEAN NOT NULL DEFAULT false
is_default  BOOLEAN NOT NULL DEFAULT false
```

---

## Capa 12: Reviews

### `reviews`
```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
product_id    UUID NOT NULL FK→products CASCADE
user_id       UUID FK→users SET NULL
author        VARCHAR(120) NOT NULL
email         VARCHAR(200)
rating        INTEGER NOT NULL DEFAULT 5
title         VARCHAR(200)
body          TEXT NOT NULL
status        VARCHAR(20) NOT NULL DEFAULT 'pending'  -- pending/approved/rejected
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id, product_id)
INDEX (tenant_id, status)

---

## Capa 13: Media

### `media`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
url         TEXT NOT NULL
filename    VARCHAR(300) NOT NULL
mime        VARCHAR(120)
size        INTEGER NOT NULL DEFAULT 0
alt         VARCHAR(300)
kind        VARCHAR(20) NOT NULL DEFAULT 'upload'
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id, created_at)

---

## Capa 14: Email

### `email_templates`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
key         VARCHAR(80) NOT NULL
name        VARCHAR(200) NOT NULL
subject     VARCHAR(300) NOT NULL
body_html   TEXT NOT NULL
variables   JSONB
active      BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, key)

### `email_queue`
```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
to_email      VARCHAR(200) NOT NULL
to_name       VARCHAR(200)
subject       VARCHAR(300) NOT NULL
body_html     TEXT NOT NULL
template_key  VARCHAR(80)
data          JSONB
status        VARCHAR(20) NOT NULL DEFAULT 'pending'
attempts      INTEGER NOT NULL DEFAULT 0
last_error    TEXT
scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now()
sent_at       TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id, status)

### `email_log`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
queue_id    UUID
to_email    VARCHAR(200) NOT NULL
subject     VARCHAR(300) NOT NULL
status      VARCHAR(20) NOT NULL
provider    VARCHAR(40)
error       TEXT
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

## Capa 15: WhatsApp

### `wa_templates`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
name        VARCHAR(120) NOT NULL
category    VARCHAR(60)
content     TEXT NOT NULL
active      BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id)

### `wa_workflows`
```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
name          VARCHAR(120) NOT NULL
trigger       VARCHAR(60) NOT NULL
template_name VARCHAR(120)
active        BOOLEAN NOT NULL DEFAULT true
config        JSONB
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id)

### `wa_log`
```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
to_phone      VARCHAR(40) NOT NULL
template_name VARCHAR(120)
body          TEXT
status        VARCHAR(20) NOT NULL
error         TEXT
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

## Capa 16: ERP Integration

### `erp_api_keys`
```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
name          VARCHAR(120) NOT NULL
key_hash      VARCHAR(256) NOT NULL        -- SHA-256(api_key)
key_prefix    VARCHAR(12) NOT NULL         -- 'ft_live_a3...'
scopes        JSONB NOT NULL DEFAULT '["catalog","inventory","orders","pricing","customers","webhooks"]'
rate_limit    INTEGER NOT NULL DEFAULT 1000
active        BOOLEAN NOT NULL DEFAULT true
last_used_at  TIMESTAMPTZ
expires_at    TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (key_hash)
INDEX (tenant_id)

### `erp_webhooks`
```
id          UUID PK
tenant_id   UUID NOT NULL FK→tenants
url         TEXT NOT NULL
secret      VARCHAR(256) NOT NULL
events      JSONB NOT NULL DEFAULT '["*"]'
active      BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id)

### `erp_webhook_deliveries`
```
id            UUID PK
webhook_id    UUID NOT NULL FK→erp_webhooks CASCADE
event         VARCHAR(80) NOT NULL
payload       JSONB NOT NULL
status        VARCHAR(20) NOT NULL DEFAULT 'pending'
attempts      INTEGER NOT NULL DEFAULT 0
last_response TEXT
next_retry_at TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (webhook_id)
INDEX (status)

---

## Capa 17: Sync & Migrations

### `sync_runs`
```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
kind          VARCHAR(40) NOT NULL         -- 'erp.products', 'erp.categories', 'erp.stock'
status        VARCHAR(20) NOT NULL DEFAULT 'pending'
started_at    TIMESTAMPTZ
finished_at   TIMESTAMPTZ
stats         JSONB
error_message TEXT
triggered_by  VARCHAR(80)
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (tenant_id, kind)
INDEX (tenant_id, status)

### `sync_errors`
```
id          UUID PK
run_id      UUID NOT NULL FK→sync_runs CASCADE
sku         VARCHAR(80)
source_id   VARCHAR(80)
error       TEXT NOT NULL
payload     JSONB
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```
INDEX (run_id)

### `erp_field_mappings`
```
id            UUID PK
tenant_id     UUID NOT NULL FK→tenants
entity        VARCHAR(30) NOT NULL          -- 'product', 'category', 'branch'
source_name   VARCHAR(120) NOT NULL
target_name   VARCHAR(120) NOT NULL
transform     VARCHAR(40)
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```
UNIQUE (tenant_id, entity, source_name)

---

## Resumen: 42 tablas

| Capa | Tablas | Cantidad |
|---|---|---|
| 0. Tenant | tenants, tenant_meta | 2 |
| 1. Posts | posts, post_meta | 2 |
| 2. Terms | terms, term_meta, term_relationships | 3 |
| 3. Options | options | 1 |
| 4. Users | users, user_meta, customers, customer_meta, addresses | 5 |
| 5. Products | products, product_images, product_variations, product_specifications | 4 |
| 6. Branches | branches, branch_meta, inventory, stock_movements | 4 |
| 7. Orders | orders, order_items, order_meta, order_taxes, refunds, order_tracking, order_notes | 7 |
| 8. Payments | payment_gateways, payment_gateway_meta, payments | 3 |
| 9. Coupons | coupons, coupon_usages | 2 |
| 10. Shipping | shipping_zones, shipping_zone_locations, shipping_methods, shipping_zone_methods | 4 |
| 11. Tax | tax_classes, tax_rates | 2 |
| 12. Reviews | reviews | 1 |
| 13. Media | media | 1 |
| 14. Email | email_templates, email_queue, email_log | 3 |
| 15. WhatsApp | wa_templates, wa_workflows, wa_log | 3 |
| 16. ERP | erp_api_keys, erp_webhooks, erp_webhook_deliveries | 3 |
| 17. Sync | sync_runs, sync_errors, erp_field_mappings | 3 |
| **TOTAL** | | **52** |

---

## Ventajas vs schema actual

| Problema actual | Solución nueva |
|---|---|
| 6 tablas sin tenant_id | Toda tabla tiene tenant_id |
| stock_movements varchar | Todo UUID |
| payments sin FK | payments FK→orders CASCADE |
| Sin metadata flexible | post_meta, term_meta, user_meta, customer_meta, branch_meta, order_meta, payment_gateway_meta |
| categories + brands separados | terms unificado con taxonomy |
| pages separadas de products | posts unificado con type |
| slides sin tenant | posts (type=slide) con tenant |
| Sin tracking de pedidos | order_tracking table |
| Sin refunds estructurados | refunds table |
| Sin notas de pedido | order_notes table |
| Sin addresses | addresses table |
| Sin coupon_usages | coupon_usages table |
| Shipping en JSONB | shipping_zones + locations + methods tablas |
| Tax en JSONB | tax_classes + tax_rates tablas |
| Sin ERP API keys | erp_api_keys table |
| Sin webhooks | erp_webhooks + deliveries |
| Settings sin list | options con autoload |
| Sync sin tenant | sync_runs con tenant_id |

---

## Cómo funcionan los plugins con metadata

```typescript
// Plugin Bancard guarda config en payment_gateway_meta:
INSERT INTO payment_gateway_meta (gateway_id, meta_key, meta_value, is_sensitive)
VALUES ('uuid-bancard', 'public_key', 'WpVAfX...', true),
       ('uuid-bancard', 'private_key', 'I1fxV...', true),
       ('uuid-bancard', 'env', 'staging', false);

// API filtra is_sensitive=true → "••••••••"
// Backend lee meta_value directo de DB

// Plugin Multi-Inventory guarda config en options:
INSERT INTO options (tenant_id, option_name, option_value)
VALUES ('uuid-tenant', 'plugin_multi_inventory', '{"branches":true,"inventory":true,...}');

// Plugin ERP guarda API keys en erp_api_keys:
INSERT INTO erp_api_keys (tenant_id, name, key_hash, key_prefix, scopes)
VALUES ('uuid-tenant', 'ERP Production', 'sha256hash...', 'ft_live_a3...', '["catalog","inventory"]');
```

Ningún plugin necesita crear tablas nuevas. Todo via metadata.
