CREATE TABLE "farmatotal_app"."order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"sku" varchar(80) NOT NULL,
	"title" varchar(300) NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(30) NOT NULL,
	"user_id" uuid,
	"customer_name" varchar(200) NOT NULL,
	"customer_email" varchar(254) NOT NULL,
	"customer_phone" varchar(40),
	"customer_doc" varchar(40),
	"shipping_method" varchar(20) NOT NULL,
	"branch_id" uuid,
	"shipping_address" jsonb,
	"payment_method" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"coupon_code" varchar(60),
	"events" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_uk" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(250) NOT NULL,
	"title" varchar(300) NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"seo" jsonb,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_uk" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."settings" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"type" varchar(20) DEFAULT 'percent' NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_uk" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "farmatotal_app"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" varchar(30) DEFAULT 'bancard' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"amount" integer NOT NULL,
	"provider_ref" varchar(120),
	"raw_payload" varchar(4000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farmatotal_app"."order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "farmatotal_app"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."order_lines" ADD CONSTRAINT "order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "farmatotal_app"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "farmatotal_app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "farmatotal_app"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_lines_order_idx" ON "farmatotal_app"."order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "farmatotal_app"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "farmatotal_app"."orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "farmatotal_app"."orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "coupons_active_idx" ON "farmatotal_app"."coupons" USING btree ("active");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "farmatotal_app"."payments" USING btree ("order_id");