ALTER TABLE "farmatotal_app"."pages" ADD COLUMN "is_template" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "farmatotal_app"."pages" ADD COLUMN "template_category" varchar(120);--> statement-breakpoint
ALTER TABLE "farmatotal_app"."pages" ADD COLUMN "template_thumbnail" varchar(500);
