CREATE TABLE "farmatotal_app"."slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"image_desktop" text,
	"image_mobile" text,
	"link_href" text,
	"days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"date_from" timestamp with time zone,
	"date_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "slides_active_idx" ON "farmatotal_app"."slides" USING btree ("active");--> statement-breakpoint
CREATE INDEX "slides_position_idx" ON "farmatotal_app"."slides" USING btree ("position");