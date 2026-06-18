CREATE SCHEMA "farmatotal_app";
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip" varchar(64),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(120),
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'viewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"name" varchar(200) NOT NULL,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"flia_codigo" varchar(40),
	"icon" varchar(80),
	"description" text,
	"seo" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"erp_sourced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_uk" UNIQUE("slug"),
	CONSTRAINT "categories_flia_uk" UNIQUE("flia_codigo")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"name" varchar(200) NOT NULL,
	"logo_url" text,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"erp_sourced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_uk" UNIQUE("slug"),
	CONSTRAINT "brands_name_uk" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" varchar(300),
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(80) NOT NULL,
	"cod_interno" varchar(80),
	"slug" varchar(250) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"description_rich" jsonb,
	"brand_id" uuid,
	"category_id" uuid,
	"price_normal" integer DEFAULT 0 NOT NULL,
	"price_web" integer DEFAULT 0 NOT NULL,
	"on_promo" boolean DEFAULT false NOT NULL,
	"promo_code" varchar(60),
	"controlled" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"stock_cached" integer DEFAULT 0 NOT NULL,
	"seo" jsonb,
	"custom" jsonb,
	"title_override" varchar(300),
	"description_override" text,
	"slug_override" varchar(250),
	"erp_sourced" boolean DEFAULT false NOT NULL,
	"source_system" varchar(30),
	"source_id" varchar(80),
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_uk" UNIQUE("sku"),
	CONSTRAINT "products_cod_interno_uk" UNIQUE("cod_interno"),
	CONSTRAINT "products_slug_uk" UNIQUE("slug"),
	CONSTRAINT "products_source_uk" UNIQUE("source_system","source_id")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" text,
	"city" varchar(120),
	"phone" varchar(40),
	"lat" double precision,
	"lng" double precision,
	"schedule" jsonb,
	"pickup_enabled" boolean DEFAULT true NOT NULL,
	"delivery_enabled" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_uk" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."inventory" (
	"product_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_product_id_branch_id_pk" PRIMARY KEY("product_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."sync_cursors" (
	"kind" varchar(40) PRIMARY KEY NOT NULL,
	"cursor" text,
	"last_run_at" timestamp with time zone,
	"extra" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."sync_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"sku" varchar(80),
	"source_id" varchar(80),
	"error" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"stats" jsonb,
	"error_message" text,
	"triggered_by" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farmatotal_app"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "farmatotal_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "farmatotal_app"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "farmatotal_app"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "farmatotal_app"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "farmatotal_app"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."inventory" ADD CONSTRAINT "inventory_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "farmatotal_app"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."sync_errors" ADD CONSTRAINT "sync_errors_run_id_sync_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "farmatotal_app"."sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "farmatotal_app"."categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "farmatotal_app"."product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "farmatotal_app"."products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "farmatotal_app"."products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "farmatotal_app"."products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "farmatotal_app"."products" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "inventory_branch_idx" ON "farmatotal_app"."inventory" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "sync_errors_run_idx" ON "farmatotal_app"."sync_errors" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "sync_runs_kind_idx" ON "farmatotal_app"."sync_runs" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "sync_runs_status_idx" ON "farmatotal_app"."sync_runs" USING btree ("status");