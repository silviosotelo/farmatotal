import {
  boolean,
  jsonb,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { farmatotalApp } from "./_pgSchema";

export const docType = ["CI", "RUC"] as const;
export type DocType = (typeof docType)[number];

export const customers = farmatotalApp.table(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 180 }),
    firstName: varchar("first_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }),
    /** Razón social o nombre completo (campo de checkout real Farmatotal). */
    razonSocial: varchar("razon_social", { length: 200 }),
    docType: varchar("doc_type", { length: 8, enum: docType }),
    docNumber: varchar("doc_number", { length: 40 }),
    phone: varchar("phone", { length: 40 }),
    /** Direcciones (libreta) como JSONB hasta tener tabla dedicada. */
    addresses: jsonb("addresses").$type<unknown[]>().default([]),
    ordersCount: jsonb("orders_count").$type<number>(),
    active: boolean("active").notNull().default(true),
    sourceSystem: varchar("source_system", { length: 20 }),
    sourceId: varchar("source_id", { length: 60 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("customers_email_idx").on(t.email),
    docIdx: index("customers_doc_idx").on(t.docNumber),
    sourceUk: unique("customers_source_uk").on(t.sourceSystem, t.sourceId),
  }),
);
