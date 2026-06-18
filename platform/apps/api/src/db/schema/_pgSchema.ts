import { pgSchema } from "drizzle-orm/pg-core";

export const farmatotalApp = pgSchema("farmatotal_app");

export type SeoMeta = { title?: string; description?: string };
