-- ============================================================================
-- FARMATOTAL V2 COMPLETE SCHEMA
-- Generated from Drizzle ORM schema files
-- 84 tables total: public.* (11) + app.* (73)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SCHEMAS
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS app;

-- ============================================================================
-- PUBLIC SCHEMA TABLES (11)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. public.tenants
-- --------------------------------------------------------------------------
CREATE TABLE public.tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    domain      VARCHAR(250) UNIQUE,
    status      VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    theme       VARCHAR(120),
    config      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX tenants_slug_idx ON public.tenants (slug);
CREATE INDEX tenants_domain_idx ON public.tenants (domain);

-- --------------------------------------------------------------------------
-- 2. public.currencies
-- --------------------------------------------------------------------------
CREATE TABLE public.currencies (
    code           VARCHAR(3) PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    symbol         VARCHAR(8),
    decimal_places INTEGER NOT NULL DEFAULT 2,
    position       VARCHAR(16) NOT NULL CHECK (position IN ('before', 'after', 'before_space', 'after_space')),
    thousands_sep  VARCHAR(3),
    decimal_sep    VARCHAR(3),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3. public.countries
-- --------------------------------------------------------------------------
CREATE TABLE public.countries (
    code         VARCHAR(2) PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    name_es      VARCHAR(120),
    currency_code VARCHAR(3) REFERENCES public.currencies(code),
    phone_prefix VARCHAR(8),
    tax_enabled  BOOLEAN NOT NULL DEFAULT false,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX countries_currency_idx ON public.countries (currency_code);

-- --------------------------------------------------------------------------
-- 4. public.users
-- --------------------------------------------------------------------------
CREATE TABLE public.users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(254) NOT NULL UNIQUE,
    password_hash     TEXT NOT NULL,
    first_name        VARCHAR(120),
    last_name         VARCHAR(120),
    display_name      VARCHAR(200),
    avatar_url        VARCHAR(500),
    status            VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    email_verified_at TIMESTAMPTZ,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX users_status_idx ON public.users (status);

-- --------------------------------------------------------------------------
-- 5. public.user_meta
-- --------------------------------------------------------------------------
CREATE TABLE public.user_meta (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    meta_key   VARCHAR(255) NOT NULL,
    meta_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_meta_user_idx ON public.user_meta (user_id);

-- --------------------------------------------------------------------------
-- 6. public.roles
-- --------------------------------------------------------------------------
CREATE TABLE public.roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(120) NOT NULL UNIQUE,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 7. public.permissions
-- --------------------------------------------------------------------------
CREATE TABLE public.permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(120) NOT NULL UNIQUE,
    module      VARCHAR(80) NOT NULL,
    action      VARCHAR(80) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX permissions_module_idx ON public.permissions (module);

-- --------------------------------------------------------------------------
-- 8. public.role_permissions
-- --------------------------------------------------------------------------
CREATE TABLE public.role_permissions (
    role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- --------------------------------------------------------------------------
-- 9. public.tenant_memberships
-- --------------------------------------------------------------------------
CREATE TABLE public.tenant_memberships (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES public.roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tenant_memberships_user_tenant_uk UNIQUE (user_id, tenant_id)
);

CREATE INDEX tenant_memberships_tenant_idx ON public.tenant_memberships (tenant_id);

-- --------------------------------------------------------------------------
-- 10. public.sessions
-- --------------------------------------------------------------------------
CREATE TABLE public.sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    ip_address  VARCHAR(64),
    user_agent  TEXT,
    payload     JSONB,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON public.sessions (user_id);
CREATE INDEX sessions_expires_idx ON public.sessions (expires_at);

-- --------------------------------------------------------------------------
-- 11. public.refresh_tokens
-- --------------------------------------------------------------------------
CREATE TABLE public.refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX refresh_tokens_user_idx ON public.refresh_tokens (user_id);

-- ============================================================================
-- APP SCHEMA TABLES (73)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 12. app.posts
-- --------------------------------------------------------------------------
CREATE TABLE app.posts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES public.tenants(id),
    post_type          VARCHAR(50) NOT NULL CHECK (post_type IN ('page', 'slide', 'blog_post', 'cms_block')),
    title              TEXT NOT NULL,
    content            TEXT,
    excerpt            TEXT,
    slug               VARCHAR(255) NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publish', 'private', 'trash')),
    featured_image_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    menu_order         INTEGER NOT NULL DEFAULT 0,
    parent_id          UUID REFERENCES app.posts(id) ON DELETE SET NULL,
    author_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
    published_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ,
    CONSTRAINT posts_slug_uk UNIQUE (tenant_id, post_type, slug)
);

CREATE INDEX posts_tenant_idx ON app.posts (tenant_id);
CREATE INDEX posts_type_idx ON app.posts (post_type);
CREATE INDEX posts_status_idx ON app.posts (status);
CREATE INDEX posts_parent_idx ON app.posts (parent_id);
CREATE INDEX posts_author_idx ON app.posts (author_id);
CREATE INDEX posts_published_idx ON app.posts (published_at);

-- --------------------------------------------------------------------------
-- 13. app.post_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.post_meta (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    post_id    UUID NOT NULL REFERENCES app.posts(id) ON DELETE CASCADE,
    meta_key   VARCHAR(255) NOT NULL,
    meta_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX post_meta_post_idx ON app.post_meta (post_id);
CREATE INDEX post_meta_key_idx ON app.post_meta (meta_key);

-- --------------------------------------------------------------------------
-- 14. app.media
-- --------------------------------------------------------------------------
CREATE TABLE app.media (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    filename       VARCHAR(300) NOT NULL,
    original_name  VARCHAR(500),
    mime_type      VARCHAR(120),
    size           BIGINT,
    width          INTEGER,
    height         INTEGER,
    alt_text       TEXT,
    title          VARCHAR(300),
    caption        TEXT,
    storage_path   TEXT,
    storage_driver VARCHAR(30) NOT NULL DEFAULT 'local',
    url            TEXT NOT NULL,
    thumbnail_url  TEXT,
    uploaded_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX media_tenant_idx ON app.media (tenant_id);
CREATE INDEX media_created_idx ON app.media (created_at);
CREATE INDEX media_uploaded_by_idx ON app.media (uploaded_by);
CREATE INDEX media_deleted_idx ON app.media (deleted_at);

-- --------------------------------------------------------------------------
-- 15. app.products
-- --------------------------------------------------------------------------
CREATE TABLE app.products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
    post_id             UUID REFERENCES app.posts(id),
    type                VARCHAR(30) NOT NULL DEFAULT 'simple',
    status              VARCHAR(20) NOT NULL DEFAULT 'draft',
    sku                 VARCHAR(100),
    barcode             VARCHAR(100),
    global_unique_id    VARCHAR(100),
    regular_price       DECIMAL(26,8),
    sale_price          DECIMAL(26,8),
    sale_price_from     TIMESTAMPTZ,
    sale_price_to       TIMESTAMPTZ,
    manage_stock        BOOLEAN NOT NULL DEFAULT false,
    stock_status        VARCHAR(20) NOT NULL DEFAULT 'instock',
    backorders          VARCHAR(20) NOT NULL DEFAULT 'no',
    weight              DECIMAL(10,3),
    length              DECIMAL(10,3),
    width               DECIMAL(10,3),
    height              DECIMAL(10,3),
    virtual             BOOLEAN NOT NULL DEFAULT false,
    downloadable        BOOLEAN NOT NULL DEFAULT false,
    sold_individually   BOOLEAN NOT NULL DEFAULT false,
    min_purchase_qty    INTEGER,
    max_purchase_qty    INTEGER,
    tax_status          VARCHAR(20) NOT NULL DEFAULT 'taxable',
    tax_class_id        UUID,
    shipping_class_id   UUID REFERENCES app.term_taxonomy(id),
    featured            BOOLEAN NOT NULL DEFAULT false,
    purchase_note       TEXT,
    external_url        TEXT,
    total_sales         INTEGER NOT NULL DEFAULT 0,
    average_rating      DECIMAL(3,2) NOT NULL DEFAULT '0.00',
    rating_count        INTEGER NOT NULL DEFAULT 0,
    erp_id              VARCHAR(100),
    erp_synced_at       TIMESTAMPTZ,
    erp_sync_version    INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- --------------------------------------------------------------------------
-- 16. app.product_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.product_meta (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES app.products(id),
    meta_key   VARCHAR(255) NOT NULL,
    meta_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 17. app.product_images
-- --------------------------------------------------------------------------
CREATE TABLE app.product_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES app.products(id),
    media_id   UUID NOT NULL REFERENCES app.media(id),
    alt_text   VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 18. app.product_specifications
-- --------------------------------------------------------------------------
CREATE TABLE app.product_specifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES app.products(id),
    group_name VARCHAR(100) NOT NULL DEFAULT 'General',
    label      VARCHAR(255) NOT NULL,
    value      TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 19. app.product_variants
-- --------------------------------------------------------------------------
CREATE TABLE app.product_variants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
    sku           VARCHAR(80) NOT NULL UNIQUE,
    title         VARCHAR(250) NOT NULL,
    attributes    JSONB,
    price_normal  INTEGER NOT NULL DEFAULT 0,
    price_web     INTEGER NOT NULL DEFAULT 0,
    stock_cached  INTEGER NOT NULL DEFAULT 0,
    image_url     TEXT,
    position      INTEGER NOT NULL DEFAULT 0,
    active        BOOLEAN NOT NULL DEFAULT true,
    source_system VARCHAR(30),
    source_id     VARCHAR(80),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_variants_product_idx ON app.product_variants (product_id);

-- --------------------------------------------------------------------------
-- 20. app.product_attributes
-- --------------------------------------------------------------------------
CREATE TABLE app.product_attributes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) NOT NULL,
    label       VARCHAR(200) NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'select',
    order_by    VARCHAR(20) NOT NULL DEFAULT 'menu_order',
    has_archives BOOLEAN NOT NULL DEFAULT false,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 21. app.product_attribute_values
-- --------------------------------------------------------------------------
CREATE TABLE app.product_attribute_values (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
    attribute_id UUID NOT NULL REFERENCES app.product_attributes(id),
    name         VARCHAR(200) NOT NULL,
    slug         VARCHAR(200) NOT NULL,
    color_hex    VARCHAR(7),
    image_id     UUID REFERENCES app.media(id),
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 22. app.variant_attribute_values
-- --------------------------------------------------------------------------
CREATE TABLE app.variant_attribute_values (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
    variant_id        UUID NOT NULL REFERENCES app.product_variants(id),
    attribute_value_id UUID NOT NULL REFERENCES app.product_attribute_values(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 23. app.terms
-- --------------------------------------------------------------------------
CREATE TABLE app.terms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    name       VARCHAR(200) NOT NULL,
    slug       VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT terms_slug_uk UNIQUE (tenant_id, slug)
);

CREATE INDEX terms_tenant_idx ON app.terms (tenant_id);

-- --------------------------------------------------------------------------
-- 24. app.term_taxonomy
-- --------------------------------------------------------------------------
CREATE TABLE app.term_taxonomy (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    term_id     UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
    taxonomy    VARCHAR(50) NOT NULL,
    description TEXT,
    parent_id   UUID REFERENCES app.term_taxonomy(id) ON DELETE SET NULL,
    count       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT term_taxonomy_term_tax_uk UNIQUE (tenant_id, term_id, taxonomy)
);

CREATE INDEX term_taxonomy_term_idx ON app.term_taxonomy (term_id);
CREATE INDEX term_taxonomy_taxonomy_idx ON app.term_taxonomy (taxonomy);
CREATE INDEX term_taxonomy_parent_idx ON app.term_taxonomy (parent_id);

-- --------------------------------------------------------------------------
-- 25. app.term_relationships
-- --------------------------------------------------------------------------
CREATE TABLE app.term_relationships (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
    object_id         UUID NOT NULL,
    object_type       VARCHAR(50) NOT NULL CHECK (object_type IN ('post', 'product', 'variant')),
    term_taxonomy_id  UUID NOT NULL REFERENCES app.term_taxonomy(id) ON DELETE CASCADE,
    term_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX term_relationships_object_idx ON app.term_relationships (object_id, object_type);
CREATE INDEX term_relationships_term_taxonomy_idx ON app.term_relationships (term_taxonomy_id);

-- --------------------------------------------------------------------------
-- 26. app.term_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.term_meta (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    term_id    UUID NOT NULL REFERENCES app.terms(id) ON DELETE CASCADE,
    meta_key   VARCHAR(255) NOT NULL,
    meta_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX term_meta_term_idx ON app.term_meta (term_id);
CREATE INDEX term_meta_key_idx ON app.term_meta (meta_key);

-- --------------------------------------------------------------------------
-- 27. app.branches
-- --------------------------------------------------------------------------
CREATE TABLE app.branches (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    name       VARCHAR(255) NOT NULL,
    code       VARCHAR(50) NOT NULL,
    slug       VARCHAR(255) NOT NULL,
    address    TEXT,
    city       VARCHAR(100),
    state      VARCHAR(100),
    postcode   VARCHAR(20),
    country    VARCHAR(2) NOT NULL DEFAULT 'PY',
    phone      VARCHAR(50),
    email      VARCHAR(320),
    latitude   DECIMAL(10,8),
    longitude  DECIMAL(11,8),
    is_pickup  BOOLEAN NOT NULL DEFAULT false,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status     VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    erp_id     VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT branches_code_uk UNIQUE (tenant_id, code),
    CONSTRAINT branches_slug_uk UNIQUE (tenant_id, slug)
);

CREATE INDEX branches_tenant_idx ON app.branches (tenant_id);

-- --------------------------------------------------------------------------
-- 28. app.branch_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.branch_meta (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    branch_id  UUID NOT NULL REFERENCES app.branches(id) ON DELETE CASCADE,
    meta_key   VARCHAR(255) NOT NULL,
    meta_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX branch_meta_tenant_idx ON app.branch_meta (tenant_id);
CREATE INDEX branch_meta_branch_idx ON app.branch_meta (branch_id);

-- --------------------------------------------------------------------------
-- 29. app.inventory
-- --------------------------------------------------------------------------
CREATE TABLE app.inventory (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    branch_id  UUID NOT NULL REFERENCES app.branches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES app.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES app.product_variants(id) ON DELETE CASCADE,
    on_hand    DECIMAL(26,4) NOT NULL DEFAULT '0',
    reserved   DECIMAL(26,4) NOT NULL DEFAULT '0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inventory_tenant_idx ON app.inventory (tenant_id);
CREATE INDEX inventory_branch_idx ON app.inventory (branch_id);
CREATE INDEX inventory_product_idx ON app.inventory (product_id);
CREATE INDEX inventory_variant_idx ON app.inventory (variant_id);

-- --------------------------------------------------------------------------
-- 30. app.inventory_movements
-- --------------------------------------------------------------------------
CREATE TABLE app.inventory_movements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    inventory_id   UUID NOT NULL REFERENCES app.inventory(id) ON DELETE CASCADE,
    type           VARCHAR(30) NOT NULL CHECK (type IN ('adjustment', 'purchase', 'sale', 'return', 'transfer_in', 'transfer_out', 'reservation', 'consumption', 'release', 'restock', 'correction')),
    quantity       DECIMAL(26,4) NOT NULL,
    on_hand_before DECIMAL(26,4) NOT NULL,
    on_hand_after  DECIMAL(26,4) NOT NULL,
    reference_type VARCHAR(50),
    reference_id   UUID,
    reason         TEXT,
    created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inventory_movements_tenant_idx ON app.inventory_movements (tenant_id);
CREATE INDEX inventory_movements_inventory_idx ON app.inventory_movements (inventory_id);

-- --------------------------------------------------------------------------
-- 31. app.inventory_reservations
-- --------------------------------------------------------------------------
CREATE TABLE app.inventory_reservations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    order_id   UUID NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inventory_reservations_tenant_idx ON app.inventory_reservations (tenant_id);
CREATE INDEX inventory_reservations_order_idx ON app.inventory_reservations (order_id);
CREATE INDEX inventory_reservations_status_idx ON app.inventory_reservations (status);

-- --------------------------------------------------------------------------
-- 32. app.inventory_reservation_lines
-- --------------------------------------------------------------------------
CREATE TABLE app.inventory_reservation_lines (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    reservation_id UUID NOT NULL REFERENCES app.inventory_reservations(id) ON DELETE CASCADE,
    inventory_id   UUID NOT NULL REFERENCES app.inventory(id) ON DELETE CASCADE,
    quantity       DECIMAL(26,4) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inventory_reservation_lines_tenant_idx ON app.inventory_reservation_lines (tenant_id);
CREATE INDEX inventory_reservation_lines_reservation_idx ON app.inventory_reservation_lines (reservation_id);
CREATE INDEX inventory_reservation_lines_inventory_idx ON app.inventory_reservation_lines (inventory_id);

-- --------------------------------------------------------------------------
-- 33. app.tax_classes
-- --------------------------------------------------------------------------
CREATE TABLE app.tax_classes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tax_classes_tenant_idx ON app.tax_classes (tenant_id);
CREATE INDEX tax_classes_slug_idx ON app.tax_classes (tenant_id, slug);

-- --------------------------------------------------------------------------
-- 34. app.tax_rates
-- --------------------------------------------------------------------------
CREATE TABLE app.tax_rates (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id),
    tax_class_id         UUID REFERENCES app.tax_classes(id) ON DELETE SET NULL,
    country              VARCHAR(2) NOT NULL DEFAULT '*',
    state                VARCHAR(200) NOT NULL DEFAULT '*',
    city                 VARCHAR(200) NOT NULL DEFAULT '*',
    postcode             VARCHAR(200) NOT NULL DEFAULT '*',
    rate                 DECIMAL(10,4) NOT NULL DEFAULT '0',
    name                 VARCHAR(200) NOT NULL,
    priority             INTEGER NOT NULL DEFAULT 1,
    compound             BOOLEAN NOT NULL DEFAULT false,
    applies_to_shipping  BOOLEAN NOT NULL DEFAULT true,
    sort_order           INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

CREATE INDEX tax_rates_tenant_idx ON app.tax_rates (tenant_id);
CREATE INDEX tax_rates_class_idx ON app.tax_rates (tax_class_id);

-- --------------------------------------------------------------------------
-- 35. app.tax_rate_locations
-- --------------------------------------------------------------------------
CREATE TABLE app.tax_rate_locations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
    tax_rate_id   UUID NOT NULL REFERENCES app.tax_rates(id) ON DELETE CASCADE,
    location_code VARCHAR(200) NOT NULL,
    location_type VARCHAR(40) NOT NULL CHECK (location_type IN ('postcode', 'city', 'state', 'country')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tax_rate_locations_tenant_idx ON app.tax_rate_locations (tenant_id);
CREATE INDEX tax_rate_locations_rate_idx ON app.tax_rate_locations (tax_rate_id);

-- --------------------------------------------------------------------------
-- 36. app.shipping_zones
-- --------------------------------------------------------------------------
CREATE TABLE app.shipping_zones (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    name       VARCHAR(200) NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shipping_zones_tenant_idx ON app.shipping_zones (tenant_id);

-- --------------------------------------------------------------------------
-- 37. app.shipping_zone_locations
-- --------------------------------------------------------------------------
CREATE TABLE app.shipping_zone_locations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
    zone_id       UUID NOT NULL REFERENCES app.shipping_zones(id) ON DELETE CASCADE,
    location_code VARCHAR(200) NOT NULL,
    location_type VARCHAR(40) NOT NULL CHECK (location_type IN ('postcode', 'city', 'state', 'country', 'continent')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shipping_zone_locations_tenant_idx ON app.shipping_zone_locations (tenant_id);
CREATE INDEX shipping_zone_locations_zone_idx ON app.shipping_zone_locations (zone_id);

-- --------------------------------------------------------------------------
-- 38. app.shipping_methods
-- --------------------------------------------------------------------------
CREATE TABLE app.shipping_methods (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    method_id  VARCHAR(100) NOT NULL,
    name       VARCHAR(200) NOT NULL,
    enabled    BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL,
    config     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shipping_methods_tenant_idx ON app.shipping_methods (tenant_id);

-- --------------------------------------------------------------------------
-- 39. app.shipping_zone_methods
-- --------------------------------------------------------------------------
CREATE TABLE app.shipping_zone_methods (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
    zone_id      UUID NOT NULL REFERENCES app.shipping_zones(id) ON DELETE CASCADE,
    method_id    VARCHAR(200) NOT NULL,
    method_name  VARCHAR(200) NOT NULL,
    enabled      BOOLEAN NOT NULL DEFAULT true,
    sort_order   INTEGER NOT NULL,
    config       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shipping_zone_methods_tenant_idx ON app.shipping_zone_methods (tenant_id);
CREATE INDEX shipping_zone_methods_zone_idx ON app.shipping_zone_methods (zone_id);

-- --------------------------------------------------------------------------
-- 40. app.customers
-- --------------------------------------------------------------------------
CREATE TABLE app.customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(180),
    first_name    VARCHAR(120),
    last_name     VARCHAR(120),
    razon_social  VARCHAR(200),
    doc_type      VARCHAR(8) CHECK (doc_type IN ('CI', 'RUC')),
    doc_number    VARCHAR(40),
    phone         VARCHAR(40),
    addresses     JSONB DEFAULT '[]'::jsonb,
    orders_count  JSONB,
    active        BOOLEAN NOT NULL DEFAULT true,
    source_system VARCHAR(20),
    source_id     VARCHAR(60),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT customers_source_uk UNIQUE (source_system, source_id)
);

CREATE INDEX customers_email_idx ON app.customers (email);
CREATE INDEX customers_doc_idx ON app.customers (doc_number);

-- --------------------------------------------------------------------------
-- 41. app.coupons
-- --------------------------------------------------------------------------
CREATE TABLE app.coupons (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
    code         VARCHAR(60) NOT NULL,
    type         VARCHAR(20) NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
    value        INTEGER NOT NULL,
    min_subtotal INTEGER NOT NULL DEFAULT 0,
    max_uses     INTEGER,
    used_count   INTEGER NOT NULL DEFAULT 0,
    starts_at    TIMESTAMPTZ,
    ends_at      TIMESTAMPTZ,
    active       BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT coupons_code_uk UNIQUE (tenant_id, code)
);

CREATE INDEX coupons_active_idx ON app.coupons (active);

-- --------------------------------------------------------------------------
-- 42. app.carts
-- --------------------------------------------------------------------------
CREATE TABLE app.carts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES public.tenants(id),
    customer_id        UUID REFERENCES app.customers(id),
    session_id         VARCHAR(128),
    status             VARCHAR(20) NOT NULL DEFAULT 'active',
    currency           VARCHAR(3) NOT NULL DEFAULT 'PYG',
    prices_include_tax BOOLEAN NOT NULL DEFAULT false,
    version            INTEGER NOT NULL DEFAULT 0,
    expires_at         TIMESTAMPTZ NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 43. app.cart_items
-- --------------------------------------------------------------------------
CREATE TABLE app.cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    cart_id     UUID NOT NULL REFERENCES app.carts(id),
    line_key    VARCHAR(64) NOT NULL,
    product_id  UUID NOT NULL REFERENCES app.products(id),
    variant_id  UUID REFERENCES app.product_variants(id),
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  DECIMAL(26,8),
    subtotal    DECIMAL(26,8),
    tax_total   DECIMAL(26,8),
    total       DECIMAL(26,8),
    options     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 44. app.cart_coupons
-- --------------------------------------------------------------------------
CREATE TABLE app.cart_coupons (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    cart_id    UUID NOT NULL REFERENCES app.carts(id),
    coupon_id  UUID NOT NULL REFERENCES app.coupons(id),
    code       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 45. app.orders
-- --------------------------------------------------------------------------
CREATE TABLE app.orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
    type                VARCHAR(20) NOT NULL DEFAULT 'shop_order' CHECK (type IN ('shop_order', 'shop_order_refund')),
    parent_order_id     UUID REFERENCES app.orders(id) ON DELETE SET NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'closed')),
    payment_status      VARCHAR(30) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed')),
    fulfillment_status  VARCHAR(30) NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'partially_fulfilled', 'fulfilled', 'returned')),
    fiscal_status       VARCHAR(20) NOT NULL DEFAULT 'not_required' CHECK (fiscal_status IN ('not_required', 'pending', 'issued', 'failed', 'cancelled')),
    currency            VARCHAR(3) NOT NULL DEFAULT 'PYG',
    subtotal            DECIMAL(26,8) NOT NULL DEFAULT '0',
    discount_total      DECIMAL(26,8) NOT NULL DEFAULT '0',
    discount_tax_total  DECIMAL(26,8) NOT NULL DEFAULT '0',
    shipping_total      DECIMAL(26,8) NOT NULL DEFAULT '0',
    shipping_tax_total  DECIMAL(26,8) NOT NULL DEFAULT '0',
    item_tax_total      DECIMAL(26,8) NOT NULL DEFAULT '0',
    tax_total           DECIMAL(26,8) NOT NULL DEFAULT '0',
    fee_total           DECIMAL(26,8) NOT NULL DEFAULT '0',
    fee_tax_total       DECIMAL(26,8) NOT NULL DEFAULT '0',
    total               DECIMAL(26,8) NOT NULL DEFAULT '0',
    customer_id         UUID REFERENCES app.customers(id) ON DELETE SET NULL,
    user_id             UUID REFERENCES public.users(id) ON DELETE SET NULL,
    guest_email         VARCHAR(320),
    payment_method      VARCHAR(100),
    payment_method_title VARCHAR(200),
    branch_id           UUID REFERENCES app.branches(id) ON DELETE SET NULL,
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    customer_note       TEXT,
    order_number        VARCHAR(50),
    order_key           VARCHAR(100),
    date_paid_gmt       TIMESTAMPTZ,
    date_completed_gmt  TIMESTAMPTZ,
    date_cancelled_gmt  TIMESTAMPTZ,
    erp_id              VARCHAR(100),
    erp_synced_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT orders_order_number_uk UNIQUE (tenant_id, order_number),
    CONSTRAINT orders_order_key_uk UNIQUE (tenant_id, order_key)
);

CREATE INDEX orders_tenant_idx ON app.orders (tenant_id);
CREATE INDEX orders_status_idx ON app.orders (status);
CREATE INDEX orders_payment_status_idx ON app.orders (payment_status);
CREATE INDEX orders_fulfillment_status_idx ON app.orders (fulfillment_status);
CREATE INDEX orders_customer_idx ON app.orders (customer_id);
CREATE INDEX orders_user_idx ON app.orders (user_id);
CREATE INDEX orders_branch_idx ON app.orders (branch_id);

-- --------------------------------------------------------------------------
-- 46. app.order_addresses
-- --------------------------------------------------------------------------
CREATE TABLE app.order_addresses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
    order_id     UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('billing', 'shipping')),
    first_name   TEXT,
    last_name    TEXT,
    company      TEXT,
    address_1    TEXT,
    address_2    TEXT,
    city         TEXT,
    state        TEXT,
    postcode     TEXT,
    country      TEXT,
    email        VARCHAR(320),
    phone        VARCHAR(100),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_addresses_tenant_idx ON app.order_addresses (tenant_id);
CREATE INDEX order_addresses_order_idx ON app.order_addresses (order_id);

-- --------------------------------------------------------------------------
-- 47. app.order_operational_data
-- --------------------------------------------------------------------------
CREATE TABLE app.order_operational_data (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                    UUID NOT NULL REFERENCES public.tenants(id),
    order_id                     UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    created_via                  VARCHAR(100) NOT NULL DEFAULT 'rest',
    prices_include_tax           BOOLEAN NOT NULL DEFAULT false,
    coupon_usages_are_counted    BOOLEAN NOT NULL DEFAULT true,
    download_permission_granted  BOOLEAN NOT NULL DEFAULT false,
    cart_hash                    VARCHAR(100),
    new_order_email_sent         BOOLEAN NOT NULL DEFAULT false,
    order_stock_reduced          BOOLEAN NOT NULL DEFAULT false,
    recorded_sales               BOOLEAN NOT NULL DEFAULT false,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT order_operational_data_order_uk UNIQUE (order_id)
);

CREATE INDEX order_operational_data_tenant_idx ON app.order_operational_data (tenant_id);

-- --------------------------------------------------------------------------
-- 48. app.order_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.order_meta (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    order_id   UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    meta_key   VARCHAR(255) NOT NULL,
    meta_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_meta_tenant_idx ON app.order_meta (tenant_id);
CREATE INDEX order_meta_order_idx ON app.order_meta (order_id);
CREATE INDEX order_meta_key_idx ON app.order_meta (meta_key);

-- --------------------------------------------------------------------------
-- 49. app.order_items
-- --------------------------------------------------------------------------
CREATE TABLE app.order_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
    order_id         UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    item_type        VARCHAR(50) NOT NULL CHECK (item_type IN ('line_item', 'shipping', 'tax', 'coupon', 'fee')),
    name             TEXT NOT NULL,
    quantity         INTEGER NOT NULL,
    subtotal         DECIMAL(26,8) NOT NULL DEFAULT '0',
    subtotal_tax     DECIMAL(26,8) NOT NULL DEFAULT '0',
    total            DECIMAL(26,8) NOT NULL DEFAULT '0',
    total_tax        DECIMAL(26,8) NOT NULL DEFAULT '0',
    tax_class        VARCHAR(100),
    product_id       UUID REFERENCES app.products(id) ON DELETE SET NULL,
    variant_id       UUID REFERENCES app.product_variants(id) ON DELETE SET NULL,
    sku              VARCHAR(100),
    method_id        VARCHAR(100),
    method_title     VARCHAR(200),
    coupon_id        UUID REFERENCES app.coupons(id) ON DELETE SET NULL,
    code             VARCHAR(100),
    discount_amount  DECIMAL(26,8) NOT NULL DEFAULT '0',
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_items_tenant_idx ON app.order_items (tenant_id);
CREATE INDEX order_items_order_idx ON app.order_items (order_id);
CREATE INDEX order_items_product_idx ON app.order_items (product_id);
CREATE INDEX order_items_variant_idx ON app.order_items (variant_id);

-- --------------------------------------------------------------------------
-- 50. app.order_item_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.order_item_meta (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    order_item_id  UUID NOT NULL REFERENCES app.order_items(id) ON DELETE CASCADE,
    meta_key       VARCHAR(255) NOT NULL,
    meta_value     JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_item_meta_tenant_idx ON app.order_item_meta (tenant_id);
CREATE INDEX order_item_meta_item_idx ON app.order_item_meta (order_item_id);
CREATE INDEX order_item_meta_key_idx ON app.order_item_meta (meta_key);

-- --------------------------------------------------------------------------
-- 51. app.order_tax_lines
-- --------------------------------------------------------------------------
CREATE TABLE app.order_tax_lines (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
    order_id     UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    rate_id      UUID,
    label        VARCHAR(200) NOT NULL,
    rate         DECIMAL(10,4) NOT NULL,
    compound     BOOLEAN NOT NULL DEFAULT false,
    item_tax     DECIMAL(26,8) NOT NULL DEFAULT '0',
    shipping_tax DECIMAL(26,8) NOT NULL DEFAULT '0',
    fee_tax      DECIMAL(26,8) NOT NULL DEFAULT '0',
    total        DECIMAL(26,8) NOT NULL DEFAULT '0',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_tax_lines_tenant_idx ON app.order_tax_lines (tenant_id);
CREATE INDEX order_tax_lines_order_idx ON app.order_tax_lines (order_id);

-- --------------------------------------------------------------------------
-- 52. app.order_discount_lines
-- --------------------------------------------------------------------------
CREATE TABLE app.order_discount_lines (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
    order_id         UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    coupon_id        UUID REFERENCES app.coupons(id) ON DELETE SET NULL,
    code             VARCHAR(100) NOT NULL,
    discount_amount  DECIMAL(26,8) NOT NULL,
    discount_tax     DECIMAL(26,8) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_discount_lines_tenant_idx ON app.order_discount_lines (tenant_id);
CREATE INDEX order_discount_lines_order_idx ON app.order_discount_lines (order_id);

-- --------------------------------------------------------------------------
-- 53. app.order_shipping_lines
-- --------------------------------------------------------------------------
CREATE TABLE app.order_shipping_lines (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
    order_id      UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    method_id     VARCHAR(100) NOT NULL,
    method_title  VARCHAR(200) NOT NULL,
    amount        DECIMAL(26,8) NOT NULL,
    tax           DECIMAL(26,8) NOT NULL DEFAULT '0',
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_shipping_lines_tenant_idx ON app.order_shipping_lines (tenant_id);
CREATE INDEX order_shipping_lines_order_idx ON app.order_shipping_lines (order_id);

-- --------------------------------------------------------------------------
-- 54. app.order_timeline
-- --------------------------------------------------------------------------
CREATE TABLE app.order_timeline (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    order_id    UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL CHECK (type IN ('status_change', 'payment', 'fulfillment', 'note', 'email_sent', 'webhook_sent', 'system', 'fiscal')),
    visibility  VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer', 'both')),
    message     TEXT NOT NULL,
    metadata    JSONB,
    actor_type  VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'customer', 'system', 'gateway', 'erp')),
    actor_id    UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_timeline_tenant_idx ON app.order_timeline (tenant_id);
CREATE INDEX order_timeline_order_idx ON app.order_timeline (order_id);

-- --------------------------------------------------------------------------
-- 55. app.payment_gateways
-- --------------------------------------------------------------------------
CREATE TABLE app.payment_gateways (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    gateway_id VARCHAR(100) NOT NULL,
    name       VARCHAR(200) NOT NULL,
    enabled    BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payment_gateways_tenant_gateway_uk UNIQUE (tenant_id, gateway_id)
);

CREATE INDEX payment_gateways_tenant_idx ON app.payment_gateways (tenant_id);

-- --------------------------------------------------------------------------
-- 56. app.payment_gateway_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.payment_gateway_meta (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    gateway_id  UUID NOT NULL REFERENCES app.payment_gateways(id) ON DELETE CASCADE,
    meta_key    VARCHAR(255) NOT NULL,
    meta_value  JSONB,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_gateway_meta_tenant_idx ON app.payment_gateway_meta (tenant_id);
CREATE INDEX payment_gateway_meta_gateway_idx ON app.payment_gateway_meta (gateway_id);
CREATE INDEX payment_gateway_meta_key_idx ON app.payment_gateway_meta (meta_key);

-- --------------------------------------------------------------------------
-- 57. app.payment_tokens
-- --------------------------------------------------------------------------
CREATE TABLE app.payment_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
    customer_id  UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    gateway_id   VARCHAR(200) NOT NULL,
    token        TEXT NOT NULL,
    type         VARCHAR(200) NOT NULL DEFAULT 'credit_card' CHECK (type IN ('credit_card')),
    last4        VARCHAR(4),
    expiry_year  SMALLINT,
    expiry_month SMALLINT,
    card_type    VARCHAR(50),
    is_default   BOOLEAN NOT NULL DEFAULT false,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_tokens_tenant_idx ON app.payment_tokens (tenant_id);
CREATE INDEX payment_tokens_customer_idx ON app.payment_tokens (customer_id);

-- --------------------------------------------------------------------------
-- 58. app.payment_attempts
-- --------------------------------------------------------------------------
CREATE TABLE app.payment_attempts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
    order_id          UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    gateway           VARCHAR(100) NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'requires_action', 'processing', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
    transaction_type  VARCHAR(20) NOT NULL DEFAULT 'purchase' CHECK (transaction_type IN ('purchase', 'authorization', 'capture', 'refund', 'void')),
    amount            DECIMAL(26,8) NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'PYG',
    idempotency_key   VARCHAR(128),
    external_id       VARCHAR(255),
    external_status   VARCHAR(100),
    failure_code      VARCHAR(100),
    failure_message   TEXT,
    amount_captured   DECIMAL(26,8) NOT NULL DEFAULT '0',
    amount_refunded   DECIMAL(26,8) NOT NULL DEFAULT '0',
    payment_token_id  UUID REFERENCES app.payment_tokens(id) ON DELETE SET NULL,
    authorized_at     TIMESTAMPTZ,
    captured_at       TIMESTAMPTZ,
    failed_at         TIMESTAMPTZ,
    cancelled_at      TIMESTAMPTZ,
    refunded_at       TIMESTAMPTZ,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payment_attempts_idempotency_idx UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX payment_attempts_tenant_idx ON app.payment_attempts (tenant_id);
CREATE INDEX payment_attempts_order_idx ON app.payment_attempts (order_id);
CREATE INDEX payment_attempts_status_idx ON app.payment_attempts (status);
CREATE INDEX payment_attempts_external_idx ON app.payment_attempts (gateway, external_id);

-- --------------------------------------------------------------------------
-- 59. app.payment_token_meta
-- --------------------------------------------------------------------------
CREATE TABLE app.payment_token_meta (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
    payment_token_id UUID NOT NULL REFERENCES app.payment_tokens(id) ON DELETE CASCADE,
    meta_key         VARCHAR(255) NOT NULL,
    meta_value       JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_token_meta_tenant_idx ON app.payment_token_meta (tenant_id);
CREATE INDEX payment_token_meta_token_idx ON app.payment_token_meta (payment_token_id);
CREATE INDEX payment_token_meta_key_idx ON app.payment_token_meta (meta_key);

-- --------------------------------------------------------------------------
-- 60. app.refunds
-- --------------------------------------------------------------------------
CREATE TABLE app.refunds (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES public.tenants(id),
    order_id           UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    payment_attempt_id UUID REFERENCES app.payment_attempts(id) ON DELETE SET NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'failed', 'completed')),
    amount             DECIMAL(26,8) NOT NULL,
    currency           VARCHAR(3) NOT NULL DEFAULT 'PYG',
    reason             TEXT,
    gateway_refund_id  VARCHAR(255),
    created_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at        TIMESTAMPTZ,
    failed_at          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refunds_tenant_idx ON app.refunds (tenant_id);
CREATE INDEX refunds_order_idx ON app.refunds (order_id);
CREATE INDEX refunds_status_idx ON app.refunds (status);
CREATE INDEX refunds_payment_attempt_idx ON app.refunds (payment_attempt_id);

-- --------------------------------------------------------------------------
-- 61. app.refund_items
-- --------------------------------------------------------------------------
CREATE TABLE app.refund_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    refund_id       UUID NOT NULL REFERENCES app.refunds(id) ON DELETE CASCADE,
    order_item_id   UUID NOT NULL REFERENCES app.order_items(id) ON DELETE CASCADE,
    quantity        INTEGER NOT NULL,
    subtotal        DECIMAL(26,8) NOT NULL DEFAULT '0',
    subtotal_tax    DECIMAL(26,8) NOT NULL DEFAULT '0',
    total           DECIMAL(26,8) NOT NULL DEFAULT '0',
    total_tax       DECIMAL(26,8) NOT NULL DEFAULT '0',
    restock         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refund_items_tenant_idx ON app.refund_items (tenant_id);
CREATE INDEX refund_items_refund_idx ON app.refund_items (refund_id);
CREATE INDEX refund_items_order_item_idx ON app.refund_items (order_item_id);

-- --------------------------------------------------------------------------
-- 62. app.product_reviews
-- --------------------------------------------------------------------------
CREATE TABLE app.product_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    product_id  UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES app.customers(id) ON DELETE SET NULL,
    rating      SMALLINT NOT NULL DEFAULT 0,
    title       VARCHAR(255),
    content     TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'trash')),
    verified    BOOLEAN NOT NULL DEFAULT false,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_reviews_tenant_idx ON app.product_reviews (tenant_id);
CREATE INDEX product_reviews_product_idx ON app.product_reviews (product_id);
CREATE INDEX product_reviews_customer_idx ON app.product_reviews (customer_id);
CREATE INDEX product_reviews_status_idx ON app.product_reviews (status);

-- --------------------------------------------------------------------------
-- 63. app.outbox_events
-- --------------------------------------------------------------------------
CREATE TABLE app.outbox_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   UUID NOT NULL,
    event_type     VARCHAR(200) NOT NULL,
    payload        JSONB NOT NULL DEFAULT '{}',
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts       INTEGER NOT NULL DEFAULT 0,
    max_attempts   INTEGER NOT NULL DEFAULT 5,
    available_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at   TIMESTAMPTZ,
    last_error     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 64. app.idempotency_keys
-- --------------------------------------------------------------------------
CREATE TABLE app.idempotency_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    key             VARCHAR(128) NOT NULL,
    scope           VARCHAR(100) NOT NULL,
    request_hash    VARCHAR(64) NOT NULL,
    response_status INTEGER,
    response_body   JSONB,
    resource_id     UUID,
    resource_type   VARCHAR(50),
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 65. app.webhook_subscriptions
-- --------------------------------------------------------------------------
CREATE TABLE app.webhook_subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
    name              TEXT NOT NULL DEFAULT '',
    status            VARCHAR(20) NOT NULL DEFAULT 'active',
    delivery_url      TEXT NOT NULL,
    secret            TEXT NOT NULL,
    topic             VARCHAR(200) NOT NULL,
    api_version       SMALLINT NOT NULL DEFAULT 1,
    failure_count     SMALLINT NOT NULL DEFAULT 0,
    max_failure_count SMALLINT NOT NULL DEFAULT 5,
    user_id           UUID REFERENCES public.users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 66. app.webhook_deliveries
-- --------------------------------------------------------------------------
CREATE TABLE app.webhook_deliveries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
    subscription_id  UUID NOT NULL REFERENCES app.webhook_subscriptions(id),
    event_id         UUID REFERENCES app.outbox_events(id),
    attempt          INTEGER NOT NULL DEFAULT 1,
    request_body     JSONB NOT NULL,
    request_headers  JSONB NOT NULL DEFAULT '{}',
    response_status  SMALLINT,
    response_body    TEXT,
    duration_ms      INTEGER,
    error            TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    next_attempt_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 67. app.webhook_receipts
-- --------------------------------------------------------------------------
CREATE TABLE app.webhook_receipts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES public.tenants(id),
    provider           VARCHAR(100) NOT NULL,
    external_event_id  VARCHAR(255) NOT NULL,
    payload_hash       VARCHAR(64) NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'received',
    error              TEXT,
    received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 68. app.jobs
-- --------------------------------------------------------------------------
CREATE TABLE app.jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
    type          VARCHAR(200) NOT NULL,
    queue         VARCHAR(100) NOT NULL DEFAULT 'default',
    payload       JSONB NOT NULL DEFAULT '{}',
    status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority      INTEGER NOT NULL DEFAULT 0,
    attempts      INTEGER NOT NULL DEFAULT 0,
    max_attempts  INTEGER NOT NULL DEFAULT 3,
    run_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    failed_at     TIMESTAMPTZ,
    locked_at     TIMESTAMPTZ,
    locked_by     VARCHAR(100),
    last_error    TEXT,
    result        JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 69. app.erp_api_keys
-- --------------------------------------------------------------------------
CREATE TABLE app.erp_api_keys (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    name           VARCHAR(200) NOT NULL,
    key_hash       VARCHAR(64) NOT NULL UNIQUE,
    key_prefix     VARCHAR(8) NOT NULL,
    permissions    VARCHAR(20) NOT NULL DEFAULT 'read',
    last_access_at TIMESTAMPTZ,
    expires_at     TIMESTAMPTZ,
    status         VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 70. app.erp_field_mappings
-- --------------------------------------------------------------------------
CREATE TABLE app.erp_field_mappings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    entity_type    VARCHAR(50) NOT NULL,
    erp_field      VARCHAR(200) NOT NULL,
    platform_field VARCHAR(200) NOT NULL,
    transform      JSONB NOT NULL DEFAULT '{}',
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 71. app.sync_runs
-- --------------------------------------------------------------------------
CREATE TABLE app.sync_runs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
    type          VARCHAR(50) NOT NULL,
    direction     VARCHAR(10) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'running',
    total_records INTEGER NOT NULL DEFAULT 0,
    processed     INTEGER NOT NULL DEFAULT 0,
    errors_count  INTEGER NOT NULL DEFAULT 0,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    metadata      JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 72. app.sync_errors
-- --------------------------------------------------------------------------
CREATE TABLE app.sync_errors (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
    sync_run_id   UUID NOT NULL REFERENCES app.sync_runs(id),
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     UUID,
    erp_id        VARCHAR(100),
    error_code    VARCHAR(100),
    error_message TEXT NOT NULL,
    payload       JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 73. app.email_templates
-- --------------------------------------------------------------------------
CREATE TABLE app.email_templates (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    type       VARCHAR(100) NOT NULL,
    subject    VARCHAR(500) NOT NULL DEFAULT '',
    body_html  TEXT NOT NULL DEFAULT '',
    body_text  TEXT NOT NULL DEFAULT '',
    status     VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 74. app.email_queue
-- --------------------------------------------------------------------------
CREATE TABLE app.email_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    from_email      VARCHAR(320) NOT NULL,
    from_name       VARCHAR(255) NOT NULL DEFAULT '',
    to_email        VARCHAR(320) NOT NULL,
    to_name         VARCHAR(255) NOT NULL DEFAULT '',
    reply_to        VARCHAR(320),
    subject         VARCHAR(500) NOT NULL,
    body_html       TEXT NOT NULL DEFAULT '',
    body_text       TEXT NOT NULL DEFAULT '',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts        INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 3,
    error           TEXT,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 75. app.email_log
-- --------------------------------------------------------------------------
CREATE TABLE app.email_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    queue_id    UUID,
    to_email    VARCHAR(320) NOT NULL,
    subject     VARCHAR(500) NOT NULL,
    status      VARCHAR(20) NOT NULL,
    error       TEXT,
    duration_ms INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 76. app.wa_templates
-- --------------------------------------------------------------------------
CREATE TABLE app.wa_templates (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(120) NOT NULL,
    category   VARCHAR(60),
    content    TEXT NOT NULL,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 77. app.wa_workflows
-- --------------------------------------------------------------------------
CREATE TABLE app.wa_workflows (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(120) NOT NULL,
    trigger       VARCHAR(60) NOT NULL,
    template_name VARCHAR(120),
    active        BOOLEAN NOT NULL DEFAULT true,
    config        JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 78. app.wa_log
-- --------------------------------------------------------------------------
CREATE TABLE app.wa_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_phone      VARCHAR(40) NOT NULL,
    template_name VARCHAR(120),
    body          TEXT,
    status        VARCHAR(20) NOT NULL,
    error         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wa_log_created_idx ON app.wa_log (created_at);

-- --------------------------------------------------------------------------
-- 79. app.options
-- --------------------------------------------------------------------------
CREATE TABLE app.options (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    name       VARCHAR(191) NOT NULL,
    value      JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 80. app.product_download_directories
-- --------------------------------------------------------------------------
CREATE TABLE app.product_download_directories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    url        VARCHAR(1000) NOT NULL,
    enabled    BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 81. app.downloadable_product_permissions
-- --------------------------------------------------------------------------
CREATE TABLE app.downloadable_product_permissions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id),
    download_id          VARCHAR(36) NOT NULL,
    product_id           UUID NOT NULL REFERENCES app.products(id),
    order_id             UUID NOT NULL REFERENCES app.orders(id),
    order_key            VARCHAR(200) NOT NULL,
    user_email           VARCHAR(320) NOT NULL,
    customer_id          UUID REFERENCES app.customers(id),
    downloads_remaining  VARCHAR(9),
    access_granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    access_expires_at    TIMESTAMPTZ,
    download_count       INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 82. app.download_log
-- --------------------------------------------------------------------------
CREATE TABLE app.download_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
    permission_id UUID NOT NULL REFERENCES app.downloadable_product_permissions(id),
    user_id       UUID REFERENCES public.users(id),
    ip_address    VARCHAR(100),
    user_agent    TEXT,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 83. app.rate_limits
-- --------------------------------------------------------------------------
CREATE TABLE app.rate_limits (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key        VARCHAR(200) NOT NULL UNIQUE,
    expiry     TIMESTAMPTZ NOT NULL,
    remaining  SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 84. app.payments (legacy - from coupons.ts, kept for backward compat)
-- --------------------------------------------------------------------------
CREATE TABLE app.payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL,
    provider     VARCHAR(30) NOT NULL DEFAULT 'bancard',
    status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'rolled_back')),
    amount       INTEGER NOT NULL,
    provider_ref VARCHAR(120),
    raw_payload  VARCHAR(4000),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_idx ON app.payments (order_id);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- --------------------------------------------------------------------------
-- Currencies (7)
-- --------------------------------------------------------------------------
INSERT INTO public.currencies (code, name, symbol, decimal_places, position, thousands_sep, decimal_sep) VALUES
('PYG', 'Guaraní Paraguayo', '₲', 0, 'after', '.', ','),
('USD', 'Dólar Estadounidense', 'US$', 2, 'before', ',', '.'),
('BRL', 'Real Brasileño', 'R$', 2, 'before', '.', ','),
('ARS', 'Peso Argentino', 'AR$', 2, 'before', '.', ','),
('CLP', 'Peso Chileno', 'CL$', 0, 'before', '.', ','),
('UYU', 'Peso Uruguayo', 'UY$', 2, 'before', '.', ','),
('EUR', 'Euro', '€', 2, 'after', '.', ',');

-- --------------------------------------------------------------------------
-- Countries (7)
-- --------------------------------------------------------------------------
INSERT INTO public.countries (code, name, name_es, currency_code, phone_prefix, tax_enabled, sort_order) VALUES
('PY', 'Paraguay', 'Paraguay', 'PYG', '+595', true, 1),
('BR', 'Brazil', 'Brasil', 'BRL', '+55', true, 2),
('AR', 'Argentina', 'Argentina', 'ARS', '+54', true, 3),
('CL', 'Chile', 'Chile', 'CLP', '+56', true, 4),
('UY', 'Uruguay', 'Uruguay', 'UYU', '+598', true, 5),
('US', 'United States', 'Estados Unidos', 'USD', '+1', false, 6),
('ES', 'Spain', 'España', 'EUR', '+34', false, 7);

-- --------------------------------------------------------------------------
-- Roles (5)
-- --------------------------------------------------------------------------
INSERT INTO public.roles (name, slug, description, is_system) VALUES
('Super Admin', 'super-admin', 'Full system access', true),
('Tenant Admin', 'tenant-admin', 'Full access within a tenant', true),
('Manager', 'manager', 'Store manager with broad access', false),
('Staff', 'staff', 'Limited operational access', false),
('Customer', 'customer', 'Frontend customer role', false);

-- --------------------------------------------------------------------------
-- Permissions (40+)
-- --------------------------------------------------------------------------
INSERT INTO public.permissions (name, module, action, description) VALUES
-- Identity & Auth
('users.list', 'users', 'list', 'List users'),
('users.read', 'users', 'read', 'View user details'),
('users.create', 'users', 'create', 'Create users'),
('users.update', 'users', 'update', 'Update users'),
('users.delete', 'users', 'delete', 'Delete users'),
('roles.manage', 'roles', 'manage', 'Manage roles and permissions'),
-- Catalog
('products.list', 'products', 'list', 'List products'),
('products.read', 'products', 'read', 'View product details'),
('products.create', 'products', 'create', 'Create products'),
('products.update', 'products', 'update', 'Update products'),
('products.delete', 'products', 'delete', 'Delete products'),
('categories.manage', 'categories', 'manage', 'Manage product categories'),
('attributes.manage', 'attributes', 'manage', 'Manage product attributes'),
-- Orders
('orders.list', 'orders', 'list', 'List orders'),
('orders.read', 'orders', 'read', 'View order details'),
('orders.update', 'orders', 'update', 'Update orders (status, notes)'),
('orders.refund', 'orders', 'refund', 'Process order refunds'),
-- Payments
('payments.list', 'payments', 'list', 'List payments'),
('payments.read', 'payments', 'read', 'View payment details'),
('payments.refund', 'payments', 'refund', 'Process payment refunds'),
('payment_gateways.manage', 'payment_gateways', 'manage', 'Configure payment gateways'),
-- Customers
('customers.list', 'customers', 'list', 'List customers'),
('customers.read', 'customers', 'read', 'View customer details'),
('customers.create', 'customers', 'create', 'Create customers'),
('customers.update', 'customers', 'update', 'Update customers'),
('customers.delete', 'customers', 'delete', 'Delete customers'),
-- Inventory
('inventory.list', 'inventory', 'list', 'List inventory'),
('inventory.read', 'inventory', 'read', 'View inventory details'),
('inventory.update', 'inventory', 'update', 'Adjust inventory'),
('inventory.transfer', 'inventory', 'transfer', 'Transfer inventory between branches'),
-- Shipping
('shipping.manage', 'shipping', 'manage', 'Manage shipping zones and methods'),
-- Tax
('tax.manage', 'tax', 'manage', 'Manage tax classes and rates'),
-- Coupons
('coupons.list', 'coupons', 'list', 'List coupons'),
('coupons.create', 'coupons', 'create', 'Create coupons'),
('coupons.update', 'coupons', 'update', 'Update coupons'),
('coupons.delete', 'coupons', 'delete', 'Delete coupons'),
-- CMS & Content
('posts.manage', 'posts', 'manage', 'Manage posts, pages, and CMS blocks'),
('media.upload', 'media', 'upload', 'Upload media files'),
('media.delete', 'media', 'delete', 'Delete media files'),
-- Reviews
('reviews.moderate', 'reviews', 'moderate', 'Moderate product reviews'),
-- ERP & Sync
('erp.manage', 'erp', 'manage', 'Manage ERP integration settings'),
('erp.sync', 'erp', 'sync', 'Trigger ERP sync operations'),
-- Webhooks
('webhooks.manage', 'webhooks', 'manage', 'Manage webhook subscriptions'),
-- Settings
('settings.manage', 'settings', 'manage', 'Manage tenant settings');

-- --------------------------------------------------------------------------
-- Tax Classes (3 per-tenant seed pattern)
-- Run after first tenant is created:
-- INSERT INTO app.tax_classes (tenant_id, name, slug, description) VALUES
-- ('<TENANT_ID>', 'Standard', 'standard', 'Default tax class'),
-- ('<TENANT_ID>', 'Reduced', 'reduced', 'Reduced tax rate'),
-- ('<TENANT_ID>', 'Zero Rate', 'zero-rate', 'Zero tax rate (exempt)');

COMMIT;
