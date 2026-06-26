# DATABASE SCHEMA — All Tables

**Fecha:** 26 de junio de 2026
**Esquema PostgreSQL:** `app.*` (pgSchema("app"))

---

## 1. `app.tenants`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `slug` | varchar(120) | NOT NULL, UNIQUE | — |
| `name` | varchar(200) | NOT NULL | — |
| `domain` | varchar(250) | UNIQUE | — |
| `active` | boolean | NOT NULL | `true` |
| `config` | jsonb (TenantConfig) | NOT NULL | `'{}'::jsonb` |
| `created_at` | timestamptz | NOT NULL | `now()` |

---

## 2. `app.users`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `email` | varchar(254) | NOT NULL, UNIQUE | — |
| `name` | varchar(120) | — | — |
| `password_hash` | text | NOT NULL | — |
| `role` | varchar(20) | NOT NULL, enum: admin/editor/viewer/customer | `'viewer'` |
| `active` | boolean | NOT NULL | `true` |
| `last_login_at` | timestamptz | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

---

## 3. `app.refresh_tokens`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK→users.id CASCADE | — |
| `token_hash` | text | NOT NULL | — |
| `user_agent` | text | — | — |
| `ip` | varchar(64) | — | — |
| `expires_at` | timestamptz | NOT NULL | — |
| `revoked_at` | timestamptz | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

---

## 4. `app.categories`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `slug` | varchar(200) | NOT NULL | — |
| `name` | varchar(200) | NOT NULL | — |
| `parent_id` | uuid | — | — |
| `position` | integer | NOT NULL | `0` |
| `flia_codigo` | varchar(40) | — | — |
| `icon` | varchar(80) | — | — |
| `description` | text | — | — |
| `seo` | jsonb (SeoMeta) | — | — |
| `active` | boolean | NOT NULL | `true` |
| `erp_sourced` | boolean | NOT NULL | `false` |
| `custom` | jsonb | — | — |
| `source_id` | varchar(80) | — | — |
| `source_system` | varchar(40) | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE `(tenant_id, slug)` → `categories_slug_uk`
- UNIQUE `(tenant_id, flia_codigo)` → `categories_flia_uk`
- INDEX `(tenant_id)` → `categories_tenant_idx`
- INDEX `(parent_id)` → `categories_parent_idx`

---

## 5. `app.brands`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `slug` | varchar(200) | NOT NULL | — |
| `name` | varchar(200) | NOT NULL | — |
| `logo_url` | text | — | — |
| `description` | text | — | — |
| `active` | boolean | NOT NULL | `true` |
| `erp_sourced` | boolean | NOT NULL | `false` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE `(tenant_id, slug)` → `brands_slug_uk`
- UNIQUE `(tenant_id, name)` → `brands_name_uk`

---

## 6. `app.products`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `sku` | varchar(80) | NOT NULL | — |
| `cod_interno` | varchar(80) | — | — |
| `barcode` | varchar(40) | — | — |
| `slug` | varchar(250) | NOT NULL | — |
| `title` | varchar(300) | NOT NULL | — |
| `description` | text | — | — |
| `description_rich` | jsonb | — | — |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `brand_id` | uuid | FK→brands.id SET NULL | — |
| `category_id` | uuid | FK→categories.id SET NULL | — |
| `price_normal` | integer | NOT NULL | `0` |
| `price_web` | integer | NOT NULL | `0` |
| `unit` | varchar(20) | NOT NULL | `'unidad'` |
| `unit_step` | double precision | NOT NULL | `1` |
| `on_promo` | boolean | NOT NULL | `false` |
| `promo_code` | varchar(60) | — | — |
| `controlled` | boolean | NOT NULL | `false` |
| `featured` | boolean | NOT NULL | `false` |
| `status` | varchar(20) | NOT NULL, enum: draft/published/archived | `'published'` |
| `product_type` | varchar(10) | NOT NULL, enum: physical/digital/service | `'physical'` |
| `stock_cached` | integer | NOT NULL | `0` |
| `seo` | jsonb (SeoMeta) | — | — |
| `custom` | jsonb | — | — |
| `attributes` | jsonb (ProductAttribute[]) | — | — |
| `title_override` | varchar(300) | — | — |
| `description_override` | text | — | — |
| `slug_override` | varchar(250) | — | — |
| `erp_sourced` | boolean | NOT NULL | `false` |
| `source_system` | varchar(30) | — | — |
| `source_id` | varchar(80) | — | — |
| `synced_at` | timestamptz | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE `(tenant_id, sku)` → `products_sku_uk`
- UNIQUE `(tenant_id, cod_interno)` → `products_cod_interno_uk`
- UNIQUE `(tenant_id, slug)` → `products_slug_uk`
- UNIQUE `(tenant_id, source_system, source_id)` → `products_source_uk`
- INDEX `(tenant_id)` → `products_tenant_idx`
- INDEX `(category_id)` → `products_category_idx`
- INDEX `(brand_id)` → `products_brand_idx`
- INDEX `(status)` → `products_status_idx`
- INDEX `(featured)` → `products_featured_idx`

---

## 7. `app.product_images`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `product_id` | uuid | NOT NULL, FK→products.id CASCADE | — |
| `url` | text | NOT NULL | — |
| `alt` | varchar(300) | — | — |
| `position` | integer | NOT NULL | `0` |
| `is_primary` | boolean | NOT NULL | `false` |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Index:** INDEX `(product_id)` → `product_images_product_idx`

---

## 8. `app.branches`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `code` | varchar(40) | NOT NULL | — |
| `erp_code` | varchar(20) | — | — |
| `name` | varchar(200) | NOT NULL | — |
| `address` | text | — | — |
| `city` | varchar(120) | — | — |
| `phone` | varchar(40) | — | — |
| `lat` | double precision | — | — |
| `lng` | double precision | — | — |
| `schedule` | jsonb (BranchSchedule) | — | — |
| `pickup_enabled` | boolean | NOT NULL | `true` |
| `delivery_enabled` | boolean | NOT NULL | `false` |
| `active` | boolean | NOT NULL | `true` |
| `custom` | jsonb | — | — |
| `source_id` | varchar(80) | — | — |
| `source_system` | varchar(40) | — | — |
| `delivery_cost` | double precision | NOT NULL | `0` |
| `delivery_radius` | double precision | NOT NULL | `0` |
| `payment_gateways_disabled` | varchar(500) | — | — |
| `shipping_methods_disabled` | varchar(500) | — | — |
| `countries_allowed` | varchar(500) | — | — |
| `is_delivery_inventory` | boolean | NOT NULL | `false` |
| `is_purchasing_warehouse` | boolean | NOT NULL | `false` |
| `sort_order` | integer | NOT NULL | `0` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE `(tenant_id, code)` → `branches_code_uk`
- INDEX `(tenant_id)` → `branches_tenant_idx`

---

## 9. `app.inventory`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `product_id` | uuid | PK (composite), FK→products.id CASCADE | — |
| `branch_id` | uuid | PK (composite), FK→branches.id CASCADE | — |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `stock` | integer | NOT NULL | `0` |
| `reserved` | integer | NOT NULL | `0` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Index:** INDEX `(branch_id)` → `inventory_branch_idx`

---

## 10. `app.stock_movements`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | varchar(128) | NOT NULL | — |
| `product_id` | varchar(64) | NOT NULL | — |
| `branch_id` | varchar(64) | NOT NULL | — |
| `delta` | integer | NOT NULL | — |
| `reason` | varchar(100) | NOT NULL | — |
| `reference_id` | varchar(64) | — | — |
| `note` | text | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- INDEX `(tenant_id, product_id)` → `stock_movements_product_idx`
- INDEX `(tenant_id, branch_id)` → `stock_movements_branch_idx`

---

## 11. `app.orders`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `number` | varchar(30) | NOT NULL, UNIQUE | — |
| `user_id` | uuid | FK→users.id SET NULL | — |
| `customer_name` | varchar(200) | NOT NULL | — |
| `customer_email` | varchar(254) | NOT NULL | — |
| `customer_phone` | varchar(40) | — | — |
| `customer_doc` | varchar(40) | — | — |
| `shipping_method` | varchar(20) | NOT NULL, enum: pickup/delivery | — |
| `branch_id` | uuid | FK→branches.id SET NULL | — |
| `shipping_address` | jsonb | — | — |
| `payment_method` | varchar(20) | NOT NULL, enum: online/cash/transfer | — |
| `status` | varchar(20) | NOT NULL, enum: pending/paid/processing/fulfilled/delivered/cancelled/refunded | `'pending'` |
| `currency` | varchar(3) | NOT NULL | `'PYG'` |
| `subtotal` | integer | NOT NULL | `0` |
| `discount` | integer | NOT NULL | `0` |
| `shipping_cost` | integer | NOT NULL | `0` |
| `shipping_method_name` | varchar(120) | — | — |
| `tax_total` | integer | NOT NULL | `0` |
| `tax_rate_name` | varchar(60) | — | — |
| `tax_rate_percent` | double precision | NOT NULL | `0` |
| `total` | integer | NOT NULL | `0` |
| `coupon_code` | varchar(60) | — | — |
| `events` | jsonb (OrderEvent[]) | — | `'[]'::jsonb` |
| `notes` | text | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE `(number)` → `orders_number_uk`
- INDEX `(status)` → `orders_status_idx`
- INDEX `(user_id)` → `orders_user_idx`
- INDEX `(customer_email)` → `orders_email_idx`

---

## 12. `app.order_lines`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `order_id` | uuid | NOT NULL, FK→orders.id CASCADE | — |
| `product_id` | uuid | FK→products.id SET NULL | — |
| `sku` | varchar(80) | NOT NULL | — |
| `title` | varchar(300) | NOT NULL | — |
| `unit_price` | integer | NOT NULL | — |
| `quantity` | double precision | NOT NULL | — |
| `line_total` | integer | NOT NULL | — |

**Index:** INDEX `(order_id)` → `order_lines_order_idx`

---

## 13. `app.payments`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `order_id` | uuid | NOT NULL | — |
| `provider` | varchar(30) | NOT NULL | `'bancard'` |
| `status` | varchar(20) | NOT NULL, enum: pending/approved/rejected/rolled_back | `'pending'` |
| `amount` | integer | NOT NULL | — |
| `provider_ref` | varchar(120) | — | — |
| `raw_payload` | varchar(4000) | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Index:** INDEX `(order_id)` → `payments_order_idx`

**NOTE:** Sin FK constraint a orders (intencional).

---

## 14. `app.coupons`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `code` | varchar(60) | NOT NULL | — |
| `type` | varchar(20) | NOT NULL, enum: percent/fixed | `'percent'` |
| `value` | integer | NOT NULL | — |
| `min_subtotal` | integer | NOT NULL | `0` |
| `max_uses` | integer | — | — |
| `used_count` | integer | NOT NULL | `0` |
| `starts_at` | timestamptz | — | — |
| `ends_at` | timestamptz | — | — |
| `active` | boolean | NOT NULL | `true` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE `(tenant_id, code)` → `coupons_code_uk`
- INDEX `(active)` → `coupons_active_idx`

---

## 15. `app.customers`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `email` | varchar(180) | — | — |
| `first_name` | varchar(120) | — | — |
| `last_name` | varchar(120) | — | — |
| `razon_social` | varchar(200) | — | — |
| `doc_type` | varchar(8) | enum: CI/RUC | — |
| `doc_number` | varchar(40) | — | — |
| `phone` | varchar(40) | — | — |
| `addresses` | jsonb | — | `[]` |
| `orders_count` | jsonb (number) | — | — |
| `active` | boolean | NOT NULL | `true` |
| `source_system` | varchar(20) | — | — |
| `source_id` | varchar(60) | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- INDEX `(email)` → `customers_email_idx`
- INDEX `(doc_number)` → `customers_doc_idx`
- UNIQUE `(source_system, source_id)` → `customers_source_uk`

**⚠️ NOTE:** `customers` table has **NO `tenant_id` column**. It's not tenant-scoped.

---

## 16. `app.pages` (CMS)

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL, FK→tenants.id | — |
| `slug` | varchar(250) | NOT NULL | — |
| `title` | varchar(300) | NOT NULL | — |
| `blocks` | jsonb (PageBlock[]) | — | `'[]'::jsonb` |
| `seo` | jsonb (SeoMeta) | — | — |
| `published` | boolean | NOT NULL | `false` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Index:** UNIQUE `(tenant_id, slug)` → `pages_slug_uk`

---

## 17. `app.settings`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `key` | varchar(120) | PK (composite) | — |
| `tenant_id` | uuid | PK (composite), FK→tenants.id | — |
| `value` | jsonb | — | — |
| `updated_at` | timestamptz | NOT NULL | `now()` |

---

## 18. `app.slides`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `title` | varchar(200) | NOT NULL | — |
| `image_desktop` | text | — | — |
| `image_mobile` | text | — | — |
| `link_href` | text | — | — |
| `days` | jsonb (number[]) | NOT NULL | `'[]'::jsonb` |
| `position` | integer | NOT NULL | `0` |
| `active` | boolean | NOT NULL | `true` |
| `date_from` | timestamptz | — | — |
| `date_to` | timestamptz | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** `slides` table has **NO `tenant_id`**. Global.

---

## 19. `app.reviews`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `product_id` | uuid | NOT NULL, FK→products.id CASCADE | — |
| `author` | varchar(120) | NOT NULL | — |
| `email` | varchar(200) | — | — |
| `rating` | integer | NOT NULL | `5` |
| `title` | varchar(200) | — | — |
| `body` | text | NOT NULL | — |
| `status` | varchar(20) | NOT NULL, enum: pending/approved/rejected | `'pending'` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- INDEX `(product_id)` → `reviews_product_idx`
- INDEX `(status)` → `reviews_status_idx`

---

## 20. `app.wishlist`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK→users.id CASCADE | — |
| `product_id` | uuid | NOT NULL, FK→products.id CASCADE | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE INDEX `(user_id, product_id)` → `wishlist_user_product_uq`
- INDEX `(user_id)` → `wishlist_user_idx`

---

## 21. `app.product_variants`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `product_id` | uuid | NOT NULL, FK→products.id CASCADE | — |
| `sku` | varchar(80) | NOT NULL, UNIQUE | — |
| `title` | varchar(250) | NOT NULL | — |
| `attributes` | jsonb (Record<string,string>) | — | — |
| `price_normal` | integer | NOT NULL | `0` |
| `price_web` | integer | NOT NULL | `0` |
| `stock_cached` | integer | NOT NULL | `0` |
| `image_url` | text | — | — |
| `position` | integer | NOT NULL | `0` |
| `active` | boolean | NOT NULL | `true` |
| `source_system` | varchar(30) | — | — |
| `source_id` | varchar(80) | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** `product_variants` has **NO `tenant_id`**. Relies on product→tenant FK.

---

## 22. `app.media`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `url` | text | NOT NULL | — |
| `filename` | varchar(300) | NOT NULL | — |
| `mime` | varchar(120) | — | — |
| `size` | integer | NOT NULL | `0` |
| `alt` | varchar(300) | — | — |
| `kind` | varchar(20) | NOT NULL | `'upload'` |
| `created_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** `media` table has **NO `tenant_id`**. Global.

---

## 23. `app.email_templates`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `key` | varchar(80) | NOT NULL, UNIQUE | — |
| `name` | varchar(200) | NOT NULL | — |
| `subject` | varchar(300) | NOT NULL | — |
| `body_html` | text | NOT NULL | — |
| `variables` | jsonb (string[]) | — | — |
| `active` | boolean | NOT NULL | `true` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** No `tenant_id`. Global.

---

## 24. `app.email_queue`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `to_email` | varchar(200) | NOT NULL | — |
| `to_name` | varchar(200) | — | — |
| `subject` | varchar(300) | NOT NULL | — |
| `body_html` | text | NOT NULL | — |
| `template_key` | varchar(80) | — | — |
| `data` | jsonb | — | — |
| `status` | varchar(20) | NOT NULL, enum: pending/sending/sent/failed | `'pending'` |
| `attempts` | integer | NOT NULL | `0` |
| `last_error` | text | — | — |
| `scheduled_at` | timestamptz | NOT NULL | `now()` |
| `sent_at` | timestamptz | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

---

## 25. `app.email_log`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `queue_id` | uuid | — | — |
| `to_email` | varchar(200) | NOT NULL | — |
| `subject` | varchar(300) | NOT NULL | — |
| `status` | varchar(20) | NOT NULL | — |
| `provider` | varchar(40) | — | — |
| `error` | text | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

---

## 26. `app.wa_templates`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `name` | varchar(120) | NOT NULL | — |
| `category` | varchar(60) | — | — |
| `content` | text | NOT NULL | — |
| `active` | boolean | NOT NULL | `true` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** No `tenant_id`. Global.

---

## 27. `app.wa_workflows`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `name` | varchar(120) | NOT NULL | — |
| `trigger` | varchar(60) | NOT NULL | — |
| `template_name` | varchar(120) | — | — |
| `active` | boolean | NOT NULL | `true` |
| `config` | jsonb | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** No `tenant_id`. Global.

---

## 28. `app.wa_log`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `to_phone` | varchar(40) | NOT NULL | — |
| `template_name` | varchar(120) | — | — |
| `body` | text | — | — |
| `status` | varchar(20) | NOT NULL | — |
| `error` | text | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

---

## 29. `app.sync_runs`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `kind` | varchar(40) | NOT NULL, enum: wc.products.full/wc.products.delta/erp.products/erp.stock | — |
| `status` | varchar(20) | NOT NULL, enum: pending/running/ok/failed | `'pending'` |
| `started_at` | timestamptz | — | — |
| `finished_at` | timestamptz | — | — |
| `stats` | jsonb | — | — |
| `error_message` | text | — | — |
| `triggered_by` | varchar(80) | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** Sin `tenant_id`. El endpoint GET /erp-sync/runs no filtra por tenant.

---

## 30. `app.sync_errors`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `run_id` | uuid | NOT NULL, FK→sync_runs.id CASCADE | — |
| `sku` | varchar(80) | — | — |
| `source_id` | varchar(80) | — | — |
| `error` | text | NOT NULL | — |
| `payload` | jsonb | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |

---

## 31. `app.erp_field_mappings`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | uuid | PK | `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL | — |
| `entity` | varchar(30) | NOT NULL | — |
| `source_name` | varchar(120) | NOT NULL | — |
| `target_name` | varchar(120) | NOT NULL | — |
| `transform` | varchar(40) | — | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Indexes:**
- UNIQUE `(tenant_id, entity, source_name)` → `erp_field_mappings_uk`

---

## 32. `app.sync_cursors`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `kind` | varchar(40) | PK, enum: syncJobKind | — |
| `cursor` | text | — | — |
| `last_run_at` | timestamptz | — | — |
| `extra` | jsonb | — | — |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**⚠️ NOTE:** Definida pero **NUNCA LEÍDA NI ESCRITA** por el módulo erp_sync.

---

## Issues de Schema

1. **`customers`** — No `tenant_id`. Global.
2. **`slides`** — No `tenant_id`. Global.
3. **`media`** — No `tenant_id`. Global.
4. **`email_templates`** — No `tenant_id`. Global.
5. **`wa_templates` / `wa_workflows`** — No `tenant_id`. Global.
6. **`product_variants`** — No `tenant_id`. Depende de product FK.
7. **`stock_movements`** — `tenant_id` es `varchar(128)` en vez de `uuid`.
8. **`stock_movements`** — `product_id` y `branch_id` son `varchar(64)` en vez de `uuid`.
9. **`payments`** — Sin FK constraint a `orders`.
10. **`orders`** — Sin columnas `tracking_number`, `tracking_url`, `carrier`.
11. **`sync_cursors`** — Definida pero nunca leída ni escrita.
12. **`sync_runs`** — Sin `tenant_id`. Endpoint sin tenant filter.
