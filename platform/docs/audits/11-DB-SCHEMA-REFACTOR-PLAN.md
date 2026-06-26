# DB Schema Refactor Plan — WP+WooCommerce Pattern

**Fecha:** 26 de junio de 2026
**Principio:** posts+postmeta para flexibilidad de plugins, tablas dedicadas para performance

---

## Arquitectura Propuesta

### Capa 1: WordPress Core (flexibilidad de plugins)

#### `app.posts` — Entidad universal
```sql
CREATE TABLE app.posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  post_type     VARCHAR(50) NOT NULL,      -- 'product', 'page', 'order', 'slide', 'cms_page', etc.
  post_status   VARCHAR(30) NOT NULL DEFAULT 'published', -- draft/published/archived/trash
  post_title    VARCHAR(300) NOT NULL,
  post_slug     VARCHAR(250) NOT NULL,
  post_content  TEXT,
  post_excerpt  TEXT,
  post_parent   UUID REFERENCES app.posts(id),
  post_author   UUID REFERENCES app.users(id),
  menu_order    INTEGER NOT NULL DEFAULT 0,
  source_id     VARCHAR(80),               -- ERP/Woo source ID
  source_system VARCHAR(40),               -- 'woo', 'erp', 'manual'
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX posts_tenant_slug_uk ON app.posts(tenant_id, post_type, post_slug);
CREATE INDEX posts_tenant_type_idx ON app.posts(tenant_id, post_type);
CREATE INDEX posts_tenant_type_status_idx ON app.posts(tenant_id, post_type, post_status);
CREATE INDEX posts_parent_idx ON app.posts(post_parent);
CREATE INDEX posts_source_uk ON app.posts(tenant_id, source_system, source_id) WHERE source_system IS NOT NULL;
```

#### `app.postmeta` — Metadata universal (key-value por post)
```sql
CREATE TABLE app.postmeta (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES app.posts(id) ON DELETE CASCADE,
  meta_key   VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX postmeta_post_key_idx ON app.postmeta(post_id, meta_key);
CREATE INDEX postmeta_key_idx ON app.postmeta(meta_key);
```

#### `app.terms` — Taxonomías (categorías, tags, atributos)
```sql
CREATE TABLE app.terms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(200) NOT NULL,
  taxonomy    VARCHAR(50) NOT NULL,        -- 'product_cat', 'product_tag', 'pa_color', 'pa_size'
  parent_id   UUID REFERENCES app.terms(id),
  description TEXT,
  menu_order  INTEGER NOT NULL DEFAULT 0,
  count       INTEGER NOT NULL DEFAULT 0,
  source_id   VARCHAR(80),
  source_system VARCHAR(40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX terms_tenant_taxonomy_slug_uk ON app.terms(tenant_id, taxonomy, slug);
CREATE INDEX terms_tenant_taxonomy_idx ON app.terms(tenant_id, taxonomy);
```

#### `app.term_meta` — Metadata de términos
```sql
CREATE TABLE app.term_meta (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id    UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
  meta_key   VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX term_meta_term_key_idx ON app.term_meta(term_id, meta_key);
```

#### `app.term_relationships` — Relación post↔term
```sql
CREATE TABLE app.term_relationships (
  post_id        UUID NOT NULL REFERENCES app.posts(id) ON DELETE CASCADE,
  term_id        UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, term_id)
);
```

#### `app.options` — Settings key-value (reemplaza settings table)
```sql
CREATE TABLE app.options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  option_name VARCHAR(191) NOT NULL,
  option_value JSONB,
  autoload    BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX options_tenant_name_uk ON app.options(tenant_id, option_name);
```

### Capa 2: WooCommerce-style (tablas dedicadas para performance)

#### `app.products` — Datos específicos de productos
```sql
CREATE TABLE app.products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES app.posts(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES app.tenants(id),
  sku             VARCHAR(100) NOT NULL,
  barcode         VARCHAR(40),
  cod_interno     VARCHAR(80),
  price_normal    INTEGER NOT NULL DEFAULT 0,
  price_web       INTEGER NOT NULL DEFAULT 0,
  on_promo        BOOLEAN NOT NULL DEFAULT false,
  promo_code      VARCHAR(60),
  unit            VARCHAR(20) NOT NULL DEFAULT 'unidad',
  unit_step       DOUBLE PRECISION NOT NULL DEFAULT 1,
  product_type    VARCHAR(10) NOT NULL DEFAULT 'physical', -- physical/digital/service
  manage_stock    BOOLEAN NOT NULL DEFAULT false,
  stock_status    VARCHAR(20) NOT NULL DEFAULT 'instock',  -- instock/outofstock/onbackorder
  stock_cached    INTEGER NOT NULL DEFAULT 0,
  weight          DECIMAL(10,2),
  length          DECIMAL(10,2),
  width           DECIMAL(10,2),
  height          DECIMAL(10,2),
  controlled      BOOLEAN NOT NULL DEFAULT false,
  featured        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_tenant_sku_uk ON app.products(tenant_id, sku);
CREATE INDEX products_post_idx ON app.products(post_id);
```

#### `app.product_images`
```sql
CREATE TABLE app.product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt         VARCHAR(300),
  position    INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON app.product_images(product_id);
```

#### `app.product_variations`
```sql
CREATE TABLE app.product_variations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  sku           VARCHAR(100) NOT NULL,
  title         VARCHAR(250) NOT NULL,
  price_normal  INTEGER NOT NULL DEFAULT 0,
  price_web     INTEGER NOT NULL DEFAULT 0,
  stock_cached  INTEGER NOT NULL DEFAULT 0,
  stock_status  VARCHAR(20) NOT NULL DEFAULT 'instock',
  manage_stock  BOOLEAN NOT NULL DEFAULT false,
  image_url     TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  attributes    JSONB,                     -- {"color": "rojo", "size": "L"}
  source_id     VARCHAR(80),
  source_system VARCHAR(40),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX variations_tenant_sku_uk ON app.product_variations(tenant_id, sku);
CREATE INDEX variations_product_idx ON app.product_variations(product_id);
```

#### `app.branches`
```sql
CREATE TABLE app.branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  code          VARCHAR(40) NOT NULL,
  erp_code      VARCHAR(20),
  name          VARCHAR(200) NOT NULL,
  address       TEXT,
  city          VARCHAR(120),
  phone         VARCHAR(40),
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  schedule      JSONB,
  pickup_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  delivery_cost  DOUBLE PRECISION NOT NULL DEFAULT 0,
  delivery_radius DOUBLE PRECISION NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_delivery_inventory BOOLEAN NOT NULL DEFAULT false,
  is_purchasing_warehouse BOOLEAN NOT NULL DEFAULT false,
  source_id     VARCHAR(80),
  source_system VARCHAR(40),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX branches_tenant_code_uk ON app.branches(tenant_id, code);
```

#### `app.inventory`
```sql
CREATE TABLE app.inventory (
  product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES app.branches(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  stock       INTEGER NOT NULL DEFAULT 0,
  reserved    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, branch_id)
);
```

#### `app.stock_movements` — FIXED: uuid types
```sql
CREATE TABLE app.stock_movements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES app.tenants(id),
  product_id   UUID NOT NULL REFERENCES app.products(id),
  branch_id    UUID NOT NULL REFERENCES app.branches(id),
  delta        INTEGER NOT NULL,
  reason       VARCHAR(100) NOT NULL,
  reference_id UUID,                        -- order_id if applicable
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_tenant_product_idx ON app.stock_movements(tenant_id, product_id);
CREATE INDEX stock_movements_tenant_branch_idx ON app.stock_movements(tenant_id, branch_id);
```

### Capa 3: Orders ( WooCommerce-style)

#### `app.orders`
```sql
CREATE TABLE app.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES app.tenants(id),
  number          VARCHAR(30) NOT NULL UNIQUE,
  user_id         UUID REFERENCES app.users(id) ON DELETE SET NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- pending/paid/processing/fulfilled/delivered/cancelled/refunded
  currency        VARCHAR(3) NOT NULL DEFAULT 'PYG',
  customer_name   VARCHAR(200) NOT NULL,
  customer_email  VARCHAR(254) NOT NULL,
  customer_phone  VARCHAR(40),
  customer_doc    VARCHAR(40),
  shipping_method VARCHAR(20) NOT NULL,    -- pickup/delivery
  shipping_address JSONB,
  branch_id       UUID REFERENCES app.branches(id) ON DELETE SET NULL,
  payment_method  VARCHAR(20) NOT NULL,    -- online/cash/transfer
  payment_gateway_id UUID,                 -- FK to payment_gateways
  subtotal        INTEGER NOT NULL DEFAULT 0,
  discount_total  INTEGER NOT NULL DEFAULT 0,
  shipping_total  INTEGER NOT NULL DEFAULT 0,
  tax_total       INTEGER NOT NULL DEFAULT 0,
  grand_total     INTEGER NOT NULL DEFAULT 0,
  coupon_code     VARCHAR(60),
  notes           TEXT,
  events          JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_tenant_status_idx ON app.orders(tenant_id, status);
CREATE INDEX orders_tenant_created_idx ON app.orders(tenant_id, created_at);
CREATE INDEX orders_user_idx ON app.orders(user_id);
CREATE INDEX orders_email_idx ON app.orders(customer_email);
```

#### `app.order_items`
```sql
CREATE TABLE app.order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES app.products(id) ON DELETE SET NULL,
  variation_id  UUID REFERENCES app.product_variations(id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  sku           VARCHAR(100),
  quantity      DECIMAL(10,2) NOT NULL,
  subtotal      INTEGER NOT NULL DEFAULT 0,
  subtotal_tax  INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL DEFAULT 0,
  total_tax     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX order_items_order_idx ON app.order_items(order_id);
```

#### `app.order_meta` — Metadata flexible de pedidos
```sql
CREATE TABLE app.order_meta (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  meta_key   VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_meta_order_key_idx ON app.order_meta(order_id, meta_key);
```

#### `app.order_taxes`
```sql
CREATE TABLE app.order_taxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  tax_rate_id     UUID,
  rate_name       VARCHAR(60),
  rate_percent    DECIMAL(6,4),
  amount          INTEGER NOT NULL DEFAULT 0,
  shipping_amount INTEGER NOT NULL DEFAULT 0
);
```

#### `app.refunds`
```sql
CREATE TABLE app.refunds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `app.order_tracking`
```sql
CREATE TABLE app.order_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  carrier         VARCHAR(120) NOT NULL,
  tracking_number VARCHAR(200) NOT NULL,
  tracking_url    TEXT,
  shipped_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Capa 4: Customers (WP-style users + meta)

#### `app.users` — Ya existe, se mantiene
#### `app.usermeta` — NUEVA: metadata de usuarios
```sql
CREATE TABLE app.usermeta (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  meta_key   VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX usermeta_user_key_idx ON app.usermeta(user_id, meta_key);
```

#### `app.customers` — FIXED: ahora con tenant_id
```sql
CREATE TABLE app.customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  user_id       UUID REFERENCES app.users(id) ON DELETE SET NULL,
  email         VARCHAR(180),
  first_name    VARCHAR(120),
  last_name     VARCHAR(120),
  razon_social  VARCHAR(200),
  doc_type      VARCHAR(8),                -- CI/RUC
  doc_number    VARCHAR(40),
  phone         VARCHAR(40),
  active        BOOLEAN NOT NULL DEFAULT true,
  source_id     VARCHAR(60),
  source_system VARCHAR(20),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customers_tenant_email_idx ON app.customers(tenant_id, email);
CREATE INDEX customers_tenant_doc_idx ON app.customers(tenant_id, doc_number);
```

#### `app.addresses` — NUEVA: direcciones de clientes
```sql
CREATE TABLE app.addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  type        VARCHAR(20) NOT NULL DEFAULT 'shipping', -- shipping/billing
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  company     VARCHAR(100),
  address_1   VARCHAR(255),
  address_2   VARCHAR(255),
  city        VARCHAR(100),
  state       VARCHAR(100),
  postcode    VARCHAR(20),
  country     VARCHAR(2) DEFAULT 'PY',
  phone       VARCHAR(50),
  is_default  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX addresses_customer_idx ON app.addresses(customer_id);
```

### Capa 5: Payments (WooCommerce-style)

#### `app.payment_gateways`
```sql
CREATE TABLE app.payment_gateways (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  gateway_key VARCHAR(100) NOT NULL,       -- 'bancard', 'personalpay', 'tigomoney'
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_custom   BOOLEAN NOT NULL DEFAULT false,
  config      JSONB,                       -- plugin-specific config
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX gateways_tenant_key_uk ON app.payment_gateways(tenant_id, gateway_key);
```

#### `app.payments` — FIXED: FK to orders
```sql
CREATE TABLE app.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES app.tenants(id),
  gateway_id      UUID REFERENCES app.payment_gateways(id),
  provider        VARCHAR(30) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending/approved/rejected/rolled_back
  amount          INTEGER NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'PYG',
  provider_ref    VARCHAR(120),
  authorization_number VARCHAR(40),
  ticket_number   VARCHAR(40),
  response_code   VARCHAR(10),
  raw_payload     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON app.payments(order_id);
CREATE INDEX payments_tenant_status_idx ON app.payments(tenant_id, status);
```

### Capa 6: Coupons

#### `app.coupons` — FIXED: con tenant_id (ya lo tiene)
```sql
-- Mantiene estructura actual, sin cambios
```

#### `app.coupon_usages` — NUEVA
```sql
CREATE TABLE app.coupon_usages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  UUID NOT NULL REFERENCES app.coupons(id) ON DELETE CASCADE,
  order_id   UUID NOT NULL REFERENCES app.orders(id),
  user_id    UUID REFERENCES app.users(id),
  amount     INTEGER NOT NULL,
  used_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Capa 7: Shipping & Tax (WooCommerce-style)

#### `app.shipping_zones`
```sql
CREATE TABLE app.shipping_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  name        VARCHAR(100) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `app.shipping_zone_locations`
```sql
CREATE TABLE app.shipping_zone_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id       UUID NOT NULL REFERENCES app.shipping_zones(id) ON DELETE CASCADE,
  location_code VARCHAR(100) NOT NULL,
  location_type VARCHAR(50) NOT NULL       -- 'city', 'state', 'country', 'postcode'
);
```

#### `app.shipping_methods`
```sql
CREATE TABLE app.shipping_methods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  method_key  VARCHAR(100) NOT NULL,       -- 'flat_rate', 'free_shipping', 'pickup'
  title       VARCHAR(100) NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true
);
```

#### `app.shipping_zone_methods`
```sql
CREATE TABLE app.shipping_zone_methods (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id            UUID NOT NULL REFERENCES app.shipping_zones(id) ON DELETE CASCADE,
  shipping_method_id UUID NOT NULL REFERENCES app.shipping_methods(id),
  cost               INTEGER NOT NULL DEFAULT 0,
  free_from          INTEGER,
  enabled            BOOLEAN NOT NULL DEFAULT true
);
```

#### `app.tax_classes`
```sql
CREATE TABLE app.tax_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL
);
```

#### `app.tax_rates`
```sql
CREATE TABLE app.tax_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  tax_class_id UUID REFERENCES app.tax_classes(id),
  name        VARCHAR(100) NOT NULL,
  rate        DECIMAL(6,4) NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 1,
  compound    BOOLEAN NOT NULL DEFAULT false,
  shipping    BOOLEAN NOT NULL DEFAULT false,
  is_default  BOOLEAN NOT NULL DEFAULT false
);
```

### Capa 8: Reviews

#### `app.reviews` — FIXED: con tenant_id
```sql
CREATE TABLE app.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  product_id    UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES app.users(id),
  author        VARCHAR(120) NOT NULL,
  email         VARCHAR(200),
  rating        INTEGER NOT NULL DEFAULT 5,
  title         VARCHAR(200),
  body          TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Capa 9: Media (FIXED: con tenant_id)

#### `app.media`
```sql
CREATE TABLE app.media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  url         TEXT NOT NULL,
  filename    VARCHAR(300) NOT NULL,
  mime        VARCHAR(120),
  size        INTEGER NOT NULL DEFAULT 0,
  alt         VARCHAR(300),
  kind        VARCHAR(20) NOT NULL DEFAULT 'upload',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX media_tenant_created_idx ON app.media(tenant_id, created_at);
```

### Capa 10: Email & WhatsApp (FIXED: con tenant_id)

#### `app.email_templates`
```sql
CREATE TABLE app.email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  key         VARCHAR(80) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  subject     VARCHAR(300) NOT NULL,
  body_html   TEXT NOT NULL,
  variables   JSONB,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX email_templates_tenant_key_uk ON app.email_templates(tenant_id, key);
```

#### `app.email_queue` — con tenant_id
#### `app.email_log` — con tenant_id
#### `app.wa_templates` — con tenant_id
#### `app.wa_workflows` — con tenant_id
#### `app.wa_log` — con tenant_id

### Capa 11: ERP API (nueva)

#### `app.erp_api_keys`
#### `app.erp_webhooks`
#### `app.erp_webhook_deliveries`
#### `app.product_specifications`

### Capa 12: Sync (mantener + fix)

#### `app.sync_runs` — FIXED: con tenant_id
#### `app.sync_errors` — sin cambios
#### `app.erp_field_mappings` — sin cambios
#### `app.sync_cursors` — FIXED: con tenant_id

---

## Mapeo: Tabla vieja → Tabla nueva

| Tabla Vieja | Tabla Nueva | Cambio |
|---|---|---|
| products | posts (type=product) + products | Posts+postmeta para metadata |
| categories | terms (taxonomy=product_cat) | Taxonomy system |
| brands | terms (taxonomy=product_brand) | Taxonomy system |
| pages (CMS) | posts (type=cms_page) | Posts system |
| slides | posts (type=slide) + postmeta | Posts system |
| media | media (con tenant_id) | FIX: agregar tenant_id |
| customers | customers (con tenant_id) | FIX: agregar tenant_id |
| email_templates | email_templates (con tenant_id) | FIX: agregar tenant_id |
| wa_templates | wa_templates (con tenant_id) | FIX: agregar tenant_id |
| wa_workflows | wa_workflows (con tenant_id) | FIX: agregar tenant_id |
| sync_runs | sync_runs (con tenant_id) | FIX: agregar tenant_id |
| stock_movements | stock_movements (uuid types) | FIX: varchar→uuid |
| payments | payments (con FK a orders) | FIX: agregar FK |
| settings | options | Renombrar + estructura WP |
| order_lines | order_items | Renombrar + campos Woo |

## Nuevas tablas a crear

| Tabla | Propósito |
|---|---|
| posts | Entidad universal (products, pages, slides, etc.) |
| postmeta | Metadata key-value de posts |
| terms | Taxonomías unificadas (categories, tags, attributes) |
| term_meta | Metadata de términos |
| term_relationships | Relación post↔term |
| options | Settings key-value (reemplaza settings) |
| usermeta | Metadata de usuarios |
| addresses | Direcciones de clientes |
| payment_gateways | Gateways de pago por tenant |
| coupon_usages | Uso de cupones por pedido |
| shipping_zones | Zonas de envío |
| shipping_zone_locations | Locations de zonas |
| shipping_methods | Métodos de envío |
| shipping_zone_methods | Métodos por zona |
| tax_classes | Clases de impuestos |
| tax_rates | Tasas de impuestos |
| order_meta | Metadata flexible de pedidos |
| order_taxes | Impuestos por pedido |
| refunds | Reembolsos |
| order_tracking | Tracking de envíos |
| erp_api_keys | API keys para ERP |
| erp_webhooks | Webhooks registrables |
| erp_webhook_deliveries | Log de entregas de webhooks |
| product_specifications | Ficha técnica de productos |

## Fixes de consistencia

| Issue | Fix |
|---|---|
| customers sin tenant_id | Agregar tenant_id |
| slides sin tenant_id | Mover a posts (type=slide) con tenant_id |
| media sin tenant_id | Agregar tenant_id |
| email_templates sin tenant_id | Agregar tenant_id |
| wa_templates sin tenant_id | Agregar tenant_id |
| wa_workflows sin tenant_id | Agregar tenant_id |
| sync_runs sin tenant_id | Agregar tenant_id |
| stock_movements varchar | Cambiar a uuid |
| payments sin FK | Agregar FK a orders |
| orders sin tracking | Agregar order_tracking table |

## Fases de Migración

### Fase 1: Fixes críticos (sin cambiar estructura)
- Agregar tenant_id a: customers, media, email_templates, wa_templates, wa_workflows, sync_runs
- Fix stock_movements: varchar → uuid
- Fix payments: agregar FK a orders

### Fase 2: Nuevas tablas WP-style
- Crear posts + postmeta + terms + term_meta + term_relationships
- Crear options (reemplaza settings)
- Crear usermeta + addresses

### Fase 3: Migrar datos a posts+postmeta
- products → posts (type=product) + products (datos específicos)
- categories → terms (taxonomy=product_cat)
- brands → terms (taxonomy=product_brand)
- pages → posts (type=cms_page)
- slides → posts (type=slide)

### Fase 4: Nuevas tablas Woo-style
- payment_gateways, shipping_zones, shipping_methods, tax_classes, tax_rates
- order_items (renombra order_lines), order_meta, order_taxes, refunds
- coupon_usages, order_tracking
- product_specifications

### Fase 5: ERP API tables
- erp_api_keys, erp_webhooks, erp_webhook_deliveries

### Fase 6: Actualizar API + Admin + Store
- Actualizar todos los servicios, rutas, y componentes
- Migrar queries de Drizzle
