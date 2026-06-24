import { sql } from "drizzle-orm";
import { integer, jsonb, text, timestamp, uuid, varchar, index, unique } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";

export const syncJobKind = ["wc.products.full", "wc.products.delta", "erp.products", "erp.stock"] as const;
export type SyncJobKind = (typeof syncJobKind)[number];

export const syncRuns = appSchema.table(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: varchar("kind", { length: 40, enum: syncJobKind }).notNull(),
    status: varchar("status", { length: 20, enum: ["pending", "running", "ok", "failed"] as const })
      .notNull()
      .default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    stats: jsonb("stats").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    triggeredBy: varchar("triggered_by", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    kindIdx: index("sync_runs_kind_idx").on(t.kind),
    statusIdx: index("sync_runs_status_idx").on(t.status),
  }),
);

export const syncErrors = appSchema.table(
  "sync_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => syncRuns.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 80 }),
    sourceId: varchar("source_id", { length: 80 }),
    error: text("error").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runIdx: index("sync_errors_run_idx").on(t.runId),
  }),
);

/**
 * Mapeo de campos ERP↔plataforma, por tenant y entidad (el sincronizador agnóstico
 * lo aplica para transformar registros crudos del ERP a la entidad — incluye custom).
 */
export const erpFieldMappings = appSchema.table(
  "erp_field_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    /** product | category | branch */
    entity: varchar("entity", { length: 30 }).notNull(),
    /** nombre del campo en el ERP de origen (ej. STK_ARTICULO, name, cod_interno). */
    sourceName: varchar("source_name", { length: 120 }).notNull(),
    /** campo destino en la plataforma (columna nativa o custom.<key>). */
    targetName: varchar("target_name", { length: 120 }).notNull(),
    /** transform opcional (ej. "number", "upper", "slug"). */
    transform: varchar("transform", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    uk: unique("erp_field_mappings_uk").on(t.tenantId, t.entity, t.sourceName),
    tenantIdx: index("erp_field_mappings_tenant_idx").on(t.tenantId),
  }),
);

export const syncCursors = appSchema.table(
  "sync_cursors",
  {
    kind: varchar("kind", { length: 40, enum: syncJobKind }).notNull().primaryKey(),
    cursor: text("cursor"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    extra: jsonb("extra"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
);
