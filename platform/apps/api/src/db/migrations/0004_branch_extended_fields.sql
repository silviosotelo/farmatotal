ALTER TABLE "app"."branches"
  ADD COLUMN IF NOT EXISTS "delivery_cost" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "delivery_radius" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payment_gateways_disabled" varchar(500),
  ADD COLUMN IF NOT EXISTS "shipping_methods_disabled" varchar(500),
  ADD COLUMN IF NOT EXISTS "countries_allowed" varchar(500),
  ADD COLUMN IF NOT EXISTS "is_delivery_inventory" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_purchasing_warehouse" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "farmatotal_app"."stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" varchar(128) NOT NULL,
  "product_id" varchar(64) NOT NULL,
  "branch_id" varchar(64) NOT NULL,
  "delta" integer NOT NULL,
  "reason" varchar(100) NOT NULL,
  "reference_id" varchar(64),
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "stock_movements_tenant_product_idx"
  ON "farmatotal_app"."stock_movements" ("tenant_id", "product_id");

CREATE INDEX IF NOT EXISTS "stock_movements_tenant_branch_idx"
  ON "farmatotal_app"."stock_movements" ("tenant_id", "branch_id");
