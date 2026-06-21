import { sql } from "drizzle-orm";
import { boolean, jsonb, text, timestamp, uuid, varchar, index } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";

/** Plantillas de mensajes de WhatsApp (con variables {{var}}). */
export const waTemplates = appSchema.table("wa_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  category: varchar("category", { length: 60 }),
  content: text("content").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/** Workflows: disparador → plantilla (ej. "pedido confirmado" → template X). */
export const waWorkflows = appSchema.table("wa_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  trigger: varchar("trigger", { length: 60 }).notNull(),
  templateName: varchar("template_name", { length: 120 }),
  active: boolean("active").notNull().default(true),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Log de mensajes enviados. */
export const waLog = appSchema.table(
  "wa_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toPhone: varchar("to_phone", { length: 40 }).notNull(),
    templateName: varchar("template_name", { length: 120 }),
    body: text("body"),
    status: varchar("status", { length: 20 }).notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ createdIdx: index("wa_log_created_idx").on(t.createdAt) }),
);
