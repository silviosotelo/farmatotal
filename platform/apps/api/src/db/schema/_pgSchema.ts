import { pgSchema } from "drizzle-orm/pg-core";

export const appSchema = pgSchema("app");
// public schema uses the default pgSchema (no need to declare)

export type SeoMeta = { title?: string; description?: string };
