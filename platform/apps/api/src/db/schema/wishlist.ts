import { timestamp, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { users } from "./users";
import { products } from "./products";

/** Lista de deseos por usuario (cliente). Un producto aparece una sola vez por usuario. */
export const wishlist = appSchema.table(
  "wishlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userProductUnique: uniqueIndex("wishlist_user_product_uq").on(t.userId, t.productId),
    userIdx: index("wishlist_user_idx").on(t.userId),
  }),
);
