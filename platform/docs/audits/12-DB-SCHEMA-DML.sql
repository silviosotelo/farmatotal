# DML Completo — Basado en WooCommerce + WP posts/postmeta

**Schema:** `app.*`
**PostgreSQL 16+**
**IDs:** UUID con gen_random_uuid()
**Precios:** DECIMAL(10,2) como WooCommerce
**Multi-tenant:** tenant_id en TODAS las tablas

```sql
-- ============================================================
-- CAPA 0: TENANT
-- ============================================================

CREATE TABLE IF NOT EXISTS app.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(120) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  domain      VARCHAR(250) UNIQUE,
  config      JSONB NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT true,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.tenant_meta (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  meta_key    VARCHAR(255) NOT NULL,
  meta_value  TEXT
);
CREATE INDEX IF NOT EXISTS tenant_meta_tenant_key_idx ON app.tenant_meta(tenant_id, meta_key);

-- ============================================================
-- CAPA 1: WP POSTS + POSTMETA (entidad universal)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  post_author   UUID,
  post_type     VARCHAR(50) NOT NULL,          -- 'product', 'page', 'slide', 'blog_post'
  post_status   VARCHAR(30) NOT NULL DEFAULT 'publish',  -- publish/draft/trash
  post_title    TEXT NOT NULL,
  post_name     VARCHAR(250) NOT NULL,          -- slug
  post_content  TEXT,
  post_excerpt  TEXT,
  post_parent   UUID REFERENCES app.posts(id) ON DELETE SET NULL,
  menu_order    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  source_id     VARCHAR(80),
  source_system VARCHAR(40),
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS posts_tenant_type_name_uk ON app.posts(tenant_id, post_type, post_name);
CREATE INDEX IF NOT EXISTS posts_tenant_type_status_idx ON app.posts(tenant_id, post_type, post_status);
CREATE INDEX IF NOT EXISTS posts_parent_idx ON app.posts(post_parent);
CREATE INDEX IF NOT EXISTS posts_source_idx ON app.posts(tenant_id, source_system, source_id) WHERE source_system IS NOT NULL;

CREATE TABLE IF NOT EXISTS app.postmeta (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES app.posts(id) ON DELETE CASCADE,
  meta_key    VARCHAR(255) NOT NULL,
  meta_value  TEXT
);
CREATE INDEX IF NOT EXISTS postmeta_post_key_idx ON app.postmeta(post_id, meta_key);
CREATE INDEX IF NOT EXISTS postmeta_key_idx ON app.postmeta(meta_key);

-- ============================================================
-- CAPA 2: WP TERMS (taxonomía unificada)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.terms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(200) NOT NULL,
  taxonomy      VARCHAR(50) NOT NULL,          -- 'product_cat', 'product_tag', 'pa_color'
  parent_id     UUID REFERENCES app.terms(id) ON DELETE SET NULL,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  count         INTEGER NOT NULL DEFAULT 0,
  source_id     VARCHAR(80),
  source_system VARCHAR(40),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS terms_tenant_taxonomy_slug_uk ON app.terms(tenant_id, taxonomy, slug);
CREATE INDEX IF NOT EXISTS terms_tenant_taxonomy_idx ON app.terms(tenant_id, taxonomy);

CREATE TABLE IF NOT EXISTS app.termmeta (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id     UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
  meta_key    VARCHAR(255) NOT NULL,
  meta_value  TEXT
);
CREATE INDEX IF NOT EXISTS termmeta_term_key_idx ON app.termmeta(term_id, meta_key);

CREATE TABLE IF NOT EXISTS app.term_relationships (
  post_id        UUID NOT NULL REFERENCES app.posts(id) ON DELETE CASCADE,
  term_id        UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, term_id)
);

-- ============================================================
-- CAPA 3: WP OPTIONS (settings)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  option_name  VARCHAR(191) NOT NULL,
  option_value TEXT,
  autoload     BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS options_tenant_name_uk ON app.options(tenant_id, option_name);

-- ============================================================
-- CAPA 4: USERS + USERMETA
-- ============================================================

CREATE TABLE IF NOT EXISTS app.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES app.tenants(id),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  role            VARCHAR(50) NOT NULL DEFAULT 'editor',
  active          BOOLEAN NOT NULL DEFAULT true,
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app.posts ADD CONSTRAINT posts_author_fk FOREIGN KEY (post_author) REFERENCES app.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS app.usermeta (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  meta_key    VARCHAR(255) NOT NULL,
  meta_value  TEXT
);
CREATE INDEX IF NOT EXISTS usermeta_user_key_idx ON app.usermeta(user_id, meta_key);

-- ============================================================
-- CAPA 5: CURRENCIES + COUNTRIES + STATES
-- ============================================================

CREATE TABLE IF NOT EXISTS app.currencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  code        VARCHAR(3) NOT NULL,
  name        VARCHAR(50) NOT NULL,
  symbol      VARCHAR(10) NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS currencies_tenant_code_uk ON app.currencies(tenant_id, code);

CREATE TABLE IF NOT EXISTS app.countries (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code  VARCHAR(2) NOT NULL UNIQUE,
  name  VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS app.states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id  UUID NOT NULL REFERENCES app.countries(id) ON DELETE CASCADE,
  code        VARCHAR(10) NOT NULL,
  name        VARCHAR(100) NOT NULL
);
CREATE INDEX IF NOT EXISTS states_country_idx ON app.states(country_id);

-- ============================================================
-- CAPA 6: PRODUCTS (WooCommerce exacto)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES app.tenants(id),
  post_id           UUID NOT NULL REFERENCES app.posts(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  sku               VARCHAR(100) NOT NULL,
  description       TEXT,
  short_description TEXT,
  price             DECIMAL(10,2) NOT NULL DEFAULT 0,
  regular_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  manage_stock      BOOLEAN NOT NULL DEFAULT false,
  stock_quantity    INTEGER NOT NULL DEFAULT 0,
  stock_status      VARCHAR(20) NOT NULL DEFAULT 'instock',
  weight            DECIMAL(10,2),
  length            DECIMAL(10,2),
  width             DECIMAL(10,2),
  height            DECIMAL(10,2),
  tax_class_id      UUID,
  featured          BOOLEAN NOT NULL DEFAULT false,
  status            VARCHAR(20) NOT NULL DEFAULT 'publish',
  source_id         VARCHAR(80),
  source_system     VARCHAR(40),
  synced_at         TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku_uk ON app.products(tenant_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_slug_uk ON app.products(tenant_id, slug);
CREATE INDEX IF NOT EXISTS products_post_idx ON app.products(post_id);
CREATE INDEX IF NOT EXISTS products_tenant_status_idx ON app.products(tenant_id, status);
CREATE INDEX IF NOT EXISTS products_tenant_featured_idx ON app.products(tenant_id, featured);

-- ============================================================
-- CAPA 7: PRODUCT IMAGES + VARIATIONS + ATTRIBUTES + DOWNLOADS
-- ============================================================

CREATE TABLE IF NOT EXISTS app.product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt         VARCHAR(300),
  position    INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON app.product_images(product_id);

CREATE TABLE IF NOT EXISTS app.product_variations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  product_id    UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  sku           VARCHAR(100) NOT NULL,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  regular_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  manage_stock  BOOLEAN NOT NULL DEFAULT false,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  stock_status  VARCHAR(20) NOT NULL DEFAULT 'instock',
  weight        DECIMAL(10,2),
  length        DECIMAL(10,2),
  width         DECIMAL(10,2),
  height        DECIMAL(10,2),
  image_url     TEXT,
  attributes    JSONB,
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  source_id     VARCHAR(80),
  source_system VARCHAR(40),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS variations_tenant_sku_uk ON app.product_variations(tenant_id, sku);
CREATE INDEX IF NOT EXISTS variations_product_idx ON app.product_variations(product_id);

CREATE TABLE IF NOT EXISTS app.product_attributes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  type        VARCHAR(20) NOT NULL DEFAULT 'select'  -- select/text/color
);
CREATE UNIQUE INDEX IF NOT EXISTS attributes_tenant_slug_uk ON app.product_attributes(tenant_id, slug);

CREATE TABLE IF NOT EXISTS app.product_attribute_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id  UUID NOT NULL REFERENCES app.product_attributes(id) ON DELETE CASCADE,
  value         VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS attr_values_attribute_idx ON app.product_attribute_values(attribute_id);

CREATE TABLE IF NOT EXISTS app.product_attribute_mappings (
  product_id          UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  attribute_value_id  UUID NOT NULL REFERENCES app.product_attribute_values(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, attribute_value_id)
);

CREATE TABLE IF NOT EXISTS app.product_category_mapping (
  product_id   UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS app.product_tag_mapping (
  product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS app.downloads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  file_url    VARCHAR(512) NOT NULL
);
CREATE INDEX IF NOT EXISTS downloads_product_idx ON app.downloads(product_id);

CREATE TABLE IF NOT EXISTS app.user_downloads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  download_id         UUID NOT NULL REFERENCES app.downloads(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES app.users(id) ON DELETE SET NULL,
  order_id            UUID,
  downloads_remaining INTEGER,
  access_granted_at   TIMESTAMPTZ
);

-- ============================================================
-- CAPA 8: BRANCHES + INVENTORY + STOCK MOVEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS app.branches (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES app.tenants(id),
  code                    VARCHAR(40) NOT NULL,
  erp_code                VARCHAR(20),
  name                    VARCHAR(200) NOT NULL,
  address                 TEXT,
  city                    VARCHAR(120),
  phone                   VARCHAR(40),
  lat                     DECIMAL(10,6),
  lng                     DECIMAL(10,6),
  schedule                JSONB,
  pickup_enabled          BOOLEAN NOT NULL DEFAULT true,
  delivery_enabled        BOOLEAN NOT NULL DEFAULT false,
  delivery_cost           DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_radius         DECIMAL(10,2) NOT NULL DEFAULT 0,
  active                  BOOLEAN NOT NULL DEFAULT true,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  is_delivery_inventory   BOOLEAN NOT NULL DEFAULT false,
  is_purchasing_warehouse BOOLEAN NOT NULL DEFAULT false,
  source_id               VARCHAR(80),
  source_system           VARCHAR(40),
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS branches_tenant_code_uk ON app.branches(tenant_id, code);

CREATE TABLE IF NOT EXISTS app.branch_meta (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES app.branches(id) ON DELETE CASCADE,
  meta_key    VARCHAR(255) NOT NULL,
  meta_value  TEXT
);
CREATE INDEX IF NOT EXISTS branch_meta_branch_key_idx ON app.branch_meta(branch_id, meta_key);

CREATE TABLE IF NOT EXISTS app.inventory (
  product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES app.branches(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, branch_id)
);

CREATE TABLE IF NOT EXISTS app.stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  product_id    UUID NOT NULL REFERENCES app.products(id),
  branch_id     UUID NOT NULL REFERENCES app.branches(id),
  delta         INTEGER NOT NULL,
  reason        VARCHAR(100) NOT NULL,
  reference_id  UUID,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_tenant_product_idx ON app.stock_movements(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS stock_movements_tenant_branch_idx ON app.stock_movements(tenant_id, branch_id);

-- ============================================================
-- CAPA 9: ORDERS (WooCommerce exacto)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES app.tenants(id),
  number            VARCHAR(30) NOT NULL UNIQUE,
  user_id           UUID REFERENCES app.users(id) ON DELETE SET NULL,
  customer_id       UUID,
  customer_name     VARCHAR(200) NOT NULL,
  customer_email    VARCHAR(254) NOT NULL,
  customer_phone    VARCHAR(40),
  customer_doc      VARCHAR(40),
  status            VARCHAR(50) NOT NULL DEFAULT 'pending',
  currency_id       UUID,
  payment_gateway_id UUID,
  shipping_method   VARCHAR(20) NOT NULL,
  shipping_address  JSONB,
  branch_id         UUID REFERENCES app.branches(id) ON DELETE SET NULL,
  discount_total    DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_total    DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total       DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_code       VARCHAR(60),
  notes             TEXT,
  events            JSONB NOT NULL DEFAULT '[]',
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_tenant_status_idx ON app.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS orders_tenant_created_idx ON app.orders(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS orders_user_idx ON app.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_email_idx ON app.orders(customer_email);

CREATE TABLE IF NOT EXISTS app.order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES app.products(id) ON DELETE SET NULL,
  variation_id  UUID REFERENCES app.product_variations(id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  sku           VARCHAR(100),
  quantity      INTEGER NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal      DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal_tax  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_tax     DECIMAL(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON app.order_items(order_id);

CREATE TABLE IF NOT EXISTS app.order_meta (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  meta_key    VARCHAR(255) NOT NULL,
  meta_value  TEXT
);
CREATE INDEX IF NOT EXISTS order_meta_order_key_idx ON app.order_meta(order_id, meta_key);

CREATE TABLE IF NOT EXISTS app.order_taxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  tax_rate_id     UUID,
  rate_name       VARCHAR(60) NOT NULL,
  rate_percent    DECIMAL(6,4) NOT NULL,
  amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS order_taxes_order_idx ON app.order_taxes(order_id);

CREATE TABLE IF NOT EXISTS app.refunds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  amount      DECIMAL(10,2) NOT NULL,
  reason      VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refunds_order_idx ON app.refunds(order_id);

CREATE TABLE IF NOT EXISTS app.refund_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id     UUID NOT NULL REFERENCES app.refunds(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES app.order_items(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL,
  amount        DECIMAL(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS refund_items_refund_idx ON app.refund_items(refund_id);

CREATE TABLE IF NOT EXISTS app.order_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  carrier         VARCHAR(120) NOT NULL,
  tracking_number VARCHAR(200) NOT NULL,
  tracking_url    TEXT,
  shipped_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_tracking_order_idx ON app.order_tracking(order_id);

CREATE TABLE IF NOT EXISTS app.order_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  is_customer_notified BOOLEAN NOT NULL DEFAULT false,
  author_id           UUID REFERENCES app.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_notes_order_idx ON app.order_notes(order_id);

-- ============================================================
-- CAPA 10: PAYMENT GATEWAYS + PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS app.payment_gateways (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  gateway_key VARCHAR(100) NOT NULL,
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_custom   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gateways_tenant_key_uk ON app.payment_gateways(tenant_id, gateway_key);

ALTER TABLE app.orders ADD CONSTRAINT orders_gateway_fk FOREIGN KEY (payment_gateway_id) REFERENCES app.payment_gateways(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS app.payment_gateway_meta (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id   UUID NOT NULL REFERENCES app.payment_gateways(id) ON DELETE CASCADE,
  meta_key     VARCHAR(255) NOT NULL,
  meta_value   TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS gateway_meta_gateway_key_idx ON app.payment_gateway_meta(gateway_id, meta_key);

CREATE TABLE IF NOT EXISTS app.payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES app.tenants(id),
  gateway_id          UUID REFERENCES app.payment_gateways(id) ON DELETE SET NULL,
  provider            VARCHAR(30) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount              DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'PYG',
  provider_ref        VARCHAR(120),
  authorization_number VARCHAR(40),
  ticket_number       VARCHAR(40),
  response_code       VARCHAR(10),
  response_description VARCHAR(200),
  raw_payload         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON app.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_tenant_status_idx ON app.payments(tenant_id, status);

-- ============================================================
-- CAPA 11: COUPONS + USAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS app.coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES app.tenants(id),
  code                VARCHAR(50) NOT NULL,
  description         TEXT,
  discount_type       VARCHAR(20) NOT NULL DEFAULT 'percent',
  amount              DECIMAL(10,2) NOT NULL,
  expiry_date         TIMESTAMPTZ,
  usage_limit         INTEGER,
  usage_limit_per_user INTEGER,
  minimum_amount      DECIMAL(10,2),
  maximum_amount      DECIMAL(10,2),
  used_count          INTEGER NOT NULL DEFAULT 0,
  active              BOOLEAN NOT NULL DEFAULT true,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_tenant_code_uk ON app.coupons(tenant_id, code);

CREATE TABLE IF NOT EXISTS app.coupon_usages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES app.coupons(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES app.orders(id),
  user_id     UUID REFERENCES app.users(id) ON DELETE SET NULL,
  amount      DECIMAL(10,2) NOT NULL,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupon_usages_coupon_idx ON app.coupon_usages(coupon_id);

-- ============================================================
-- CAPA 12: SHIPPING (WooCommerce exacto)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.shipping_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  name        VARCHAR(100) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipping_zones_tenant_idx ON app.shipping_zones(tenant_id);

CREATE TABLE IF NOT EXISTS app.shipping_zone_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id       UUID NOT NULL REFERENCES app.shipping_zones(id) ON DELETE CASCADE,
  location_code VARCHAR(100) NOT NULL,
  location_type VARCHAR(50) NOT NULL
);
CREATE INDEX IF NOT EXISTS shipping_zone_locations_zone_idx ON app.shipping_zone_locations(zone_id);

CREATE TABLE IF NOT EXISTS app.shipping_methods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  method_key  VARCHAR(100) NOT NULL,
  title       VARCHAR(100) NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_methods_tenant_key_uk ON app.shipping_methods(tenant_id, method_key);

CREATE TABLE IF NOT EXISTS app.shipping_zone_methods (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id            UUID NOT NULL REFERENCES app.shipping_zones(id) ON DELETE CASCADE,
  shipping_method_id UUID NOT NULL REFERENCES app.shipping_methods(id),
  cost               DECIMAL(10,2) NOT NULL DEFAULT 0,
  enabled            BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS shipping_zone_methods_zone_idx ON app.shipping_zone_methods(zone_id);

-- ============================================================
-- CAPA 13: TAX (WooCommerce exacto)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.tax_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tax_classes_tenant_slug_uk ON app.tax_classes(tenant_id, slug);

CREATE TABLE IF NOT EXISTS app.tax_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  tax_class_id UUID REFERENCES app.tax_classes(id) ON DELETE SET NULL,
  country_id  UUID REFERENCES app.countries(id) ON DELETE SET NULL,
  state_id    UUID REFERENCES app.states(id) ON DELETE SET NULL,
  rate        DECIMAL(6,4) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 1,
  compound    BOOLEAN NOT NULL DEFAULT false,
  shipping    BOOLEAN NOT NULL DEFAULT false,
  is_default  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS tax_rates_tenant_idx ON app.tax_rates(tenant_id);

-- ============================================================
-- CAPA 14: CATEGORIES + TAGS (via terms, mapping tables ya creadas)
-- -- categories = terms WHERE taxonomy='product_cat'
-- -- tags = terms WHERE taxonomy='product_tag'
-- -- product_category_mapping y product_tag_mapping ya creadas arriba

-- ============================================================
-- CAPA 15: PRODUCT REVIEWS (WooCommerce exacto)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.product_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES app.tenants(id),
  product_id      UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES app.users(id) ON DELETE SET NULL,
  reviewer_name   VARCHAR(100) NOT NULL,
  reviewer_email  VARCHAR(255),
  rating          INTEGER NOT NULL DEFAULT 5,
  title           VARCHAR(200),
  content         TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_tenant_product_idx ON app.product_reviews(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS reviews_tenant_status_idx ON app.product_reviews(tenant_id, status);

-- ============================================================
-- CAPA 16: ADDRESSES
-- ============================================================

CREATE TABLE IF NOT EXISTS app.addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  user_id     UUID REFERENCES app.users(id) ON DELETE CASCADE,
  address_type VARCHAR(20) NOT NULL DEFAULT 'shipping',
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  company     VARCHAR(100),
  address_1   VARCHAR(255),
  address_2   VARCHAR(255),
  city        VARCHAR(100),
  state_id    UUID REFERENCES app.states(id) ON DELETE SET NULL,
  postcode    VARCHAR(20),
  country_id  UUID REFERENCES app.countries(id) ON DELETE SET NULL,
  phone       VARCHAR(50),
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_idx ON app.addresses(user_id);

-- ============================================================
-- CAPA 17: CARTS (WooCommerce exacto)
-- ============================================================

CREATE TABLE IF NOT EXISTS app.carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  user_id     UUID REFERENCES app.users(id) ON DELETE SET NULL,
  session_key VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES app.carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES app.product_variations(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cart_items_cart_idx ON app.cart_items(cart_id);

-- ============================================================
-- CAPA 18: MEDIA
-- ============================================================

CREATE TABLE IF NOT EXISTS app.media (
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
CREATE INDEX IF NOT EXISTS media_tenant_created_idx ON app.media(tenant_id, created_at);

-- ============================================================
-- CAPA 19: EMAIL
-- ============================================================

CREATE TABLE IF NOT EXISTS app.email_templates (
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
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_tenant_key_uk ON app.email_templates(tenant_id, key);

CREATE TABLE IF NOT EXISTS app.email_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  to_email      VARCHAR(200) NOT NULL,
  to_name       VARCHAR(200),
  subject       VARCHAR(300) NOT NULL,
  body_html     TEXT NOT NULL,
  template_key  VARCHAR(80),
  data          JSONB,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_queue_tenant_status_idx ON app.email_queue(tenant_id, status);

CREATE TABLE IF NOT EXISTS app.email_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  queue_id    UUID,
  to_email    VARCHAR(200) NOT NULL,
  subject     VARCHAR(300) NOT NULL,
  status      VARCHAR(20) NOT NULL,
  provider    VARCHAR(40),
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CAPA 20: WHATSAPP
-- ============================================================

CREATE TABLE IF NOT EXISTS app.wa_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  name        VARCHAR(120) NOT NULL,
  category    VARCHAR(60),
  content     TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.wa_workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  name          VARCHAR(120) NOT NULL,
  trigger       VARCHAR(60) NOT NULL,
  template_name VARCHAR(120),
  active        BOOLEAN NOT NULL DEFAULT true,
  config        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.wa_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  to_phone      VARCHAR(40) NOT NULL,
  template_name VARCHAR(120),
  body          TEXT,
  status        VARCHAR(20) NOT NULL,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CAPA 21: ERP INTEGRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS app.erp_api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  name          VARCHAR(120) NOT NULL,
  key_hash      VARCHAR(256) NOT NULL,
  key_prefix    VARCHAR(12) NOT NULL,
  scopes        JSONB NOT NULL DEFAULT '["catalog","inventory","orders","pricing","customers","webhooks"]',
  rate_limit    INTEGER NOT NULL DEFAULT 1000,
  active        BOOLEAN NOT NULL DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS erp_api_keys_hash_uk ON app.erp_api_keys(key_hash);

CREATE TABLE IF NOT EXISTS app.erp_webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES app.tenants(id),
  url         TEXT NOT NULL,
  secret      VARCHAR(256) NOT NULL,
  events      JSONB NOT NULL DEFAULT '["*"]',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.erp_webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID NOT NULL REFERENCES app.erp_webhooks(id) ON DELETE CASCADE,
  event         VARCHAR(80) NOT NULL,
  payload       JSONB NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_response TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CAPA 22: SYNC
-- ============================================================

CREATE TABLE IF NOT EXISTS app.sync_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  kind          VARCHAR(40) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  stats         JSONB,
  error_message TEXT,
  triggered_by  VARCHAR(80),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sync_runs_tenant_kind_idx ON app.sync_runs(tenant_id, kind);

CREATE TABLE IF NOT EXISTS app.sync_errors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID NOT NULL REFERENCES app.sync_runs(id) ON DELETE CASCADE,
  sku         VARCHAR(80),
  source_id   VARCHAR(80),
  error       TEXT NOT NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.erp_field_mappings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id),
  entity        VARCHAR(30) NOT NULL,
  source_name   VARCHAR(120) NOT NULL,
  target_name   VARCHAR(120) NOT NULL,
  transform     VARCHAR(40),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS erp_field_mappings_uk ON app.erp_field_mappings(tenant_id, entity, source_name);

-- ============================================================
-- TOTAL: 60 tablas
-- ============================================================
```
