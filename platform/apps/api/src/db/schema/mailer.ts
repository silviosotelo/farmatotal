import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";

/** Plantillas de email (con variables {{var}}). */
export const emailTemplates = appSchema.table(
  "email_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    subject: varchar("subject", { length: 300 }).notNull(),
    bodyHtml: text("body_html").notNull(),
    /** Lista de variables que acepta (para ayuda en el editor). */
    variables: jsonb("variables").$type<string[]>(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({ keyUk: unique("email_templates_key_uk").on(t.key) }),
);

/** Cola de envío: jobs con ciclo de vida. */
export const emailStatus = ["pending", "sending", "sent", "failed"] as const;
export type EmailStatus = (typeof emailStatus)[number];

export const emailQueue = appSchema.table(
  "email_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toEmail: varchar("to_email", { length: 200 }).notNull(),
    toName: varchar("to_name", { length: 200 }),
    subject: varchar("subject", { length: 300 }).notNull(),
    bodyHtml: text("body_html").notNull(),
    templateKey: varchar("template_key", { length: 80 }),
    data: jsonb("data"),
    status: varchar("status", { length: 20, enum: emailStatus }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ statusIdx: index("email_queue_status_idx").on(t.status) }),
);

/** Log de entregas (append-only, auditoría). */
export const emailLog = appSchema.table(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueId: uuid("queue_id"),
    toEmail: varchar("to_email", { length: 200 }).notNull(),
    subject: varchar("subject", { length: 300 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    provider: varchar("provider", { length: 40 }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ createdIdx: index("email_log_created_idx").on(t.createdAt) }),
);
