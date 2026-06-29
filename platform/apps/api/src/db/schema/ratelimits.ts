import { uuid, varchar, timestamp, smallint } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";

export const rateLimits = appSchema.table("rate_limits", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 200 }).notNull().unique(),
  expiry: timestamp("expiry", { withTimezone: true }).notNull(),
  remaining: smallint("remaining").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
