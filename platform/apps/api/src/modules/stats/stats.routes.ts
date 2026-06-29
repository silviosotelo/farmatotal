import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { branches, terms, coupons, orders, orderItems, products } from "../../db/schema";

/** Estados que cuentan como venta concretada (facturable). */
const REVENUE_STATUSES = ["paid", "processing", "fulfilled", "delivered"] as const;

export async function statsRoutes(app: FastifyInstance) {
  app.get("/stats/overview", async () => {
    const [prod] = await db
      .select({
        total: sql<number>`count(*)::int`,
        published: sql<number>`count(*) filter (where ${products.status} = 'published')::int`,
        outOfStock: sql<number>`count(*) filter (where ${products.stockCached} = 0)::int`,
      })
      .from(products);

    const [cat] = await db.select({ total: sql<number>`count(*)::int` }).from(terms);
    const [br] = await db.select({ total: sql<number>`count(*)::int` }).from(branches);
    const [cp] = await db.select({ total: sql<number>`count(*)::int` }).from(coupons);

    const [ord] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int`,
        paid: sql<number>`count(*) filter (where ${orders.status} = 'paid')::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} in ('paid','processing','fulfilled','delivered')),0)::bigint`,
      })
      .from(orders);

    // Top categorías por cantidad de productos
    // TODO: In V2, categories are terms linked via term_taxonomy + term_relationships
    const topCategories = await db
      .select({
        name: terms.name,
        count: sql<number>`count(${products.id})::int`,
      })
      .from(terms)
      .leftJoin(products, sql`1 = 0`) // TODO: fix join via term_relationships
      .groupBy(terms.id, terms.name)
      .orderBy(sql`count(${products.id}) desc`)
      .limit(8);

    return {
      products: {
        total: prod?.total ?? 0,
        published: prod?.published ?? 0,
        outOfStock: prod?.outOfStock ?? 0,
      },
      categories: cat?.total ?? 0,
      branches: br?.total ?? 0,
      coupons: cp?.total ?? 0,
      orders: {
        total: ord?.total ?? 0,
        pending: ord?.pending ?? 0,
        paid: ord?.paid ?? 0,
        revenue: Number(ord?.revenue ?? 0),
      },
      topCategories: topCategories.map((c) => ({ name: c.name, count: c.count })),
    };
  });

  // Reportes de ventas por rango de fechas (default últimos 30 días).
  app.get(
    "/stats/reports",
    {
      schema: {
        querystring: z.object({
          from: z.string().optional(),
          to: z.string().optional(),
        }),
      },
    },
    async (req) => {
      const q = req.query as { from?: string; to?: string };
      const to = q.to ? new Date(q.to) : new Date();
      const from = q.from ? new Date(q.from) : new Date(to.getTime() - 29 * 24 * 3600 * 1000);
      const range = and(gte(orders.createdAt, from), lte(orders.createdAt, to));
      const isRevenue = sql`${orders.status} in ('paid','processing','fulfilled','delivered')`;

      // KPIs (sólo ventas concretadas dentro del rango)
      const [kpi] = await db
        .select({
          revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${isRevenue}),0)::bigint`,
          paidOrders: sql<number>`count(*) filter (where ${isRevenue})::int`,
          allOrders: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(range);

      // Serie temporal por día
      const series = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
          revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${isRevenue}),0)::bigint`,
          orders: sql<number>`count(*) filter (where ${isRevenue})::int`,
        })
        .from(orders)
        .where(range)
        .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${orders.createdAt})`);

      // Por estado
      const byStatus = await db
        .select({
          status: orders.status,
          count: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${orders.total}),0)::bigint`,
        })
        .from(orders)
        .where(range)
        .groupBy(orders.status)
        .orderBy(sql`count(*) desc`);

      // Por método de pago
      const byPayment = await db
        .select({
          method: orders.paymentMethod,
          count: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${isRevenue}),0)::bigint`,
        })
        .from(orders)
        .where(range)
        .groupBy(orders.paymentMethod)
        .orderBy(sql`count(*) desc`);

      // Top productos por unidades e ingresos (sobre ventas concretadas)
      const topProducts = await db
        .select({
          sku: orderItems.sku,
          title: orderItems.name,
          units: sql<number>`sum(${orderItems.quantity})::int`,
          revenue: sql<number>`coalesce(sum(${orderItems.total}),0)::bigint`,
        })
        .from(orderItems)
        .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
        .where(and(range, isRevenue))
        .groupBy(orderItems.sku, orderItems.name)
        .orderBy(sql`sum(${orderItems.quantity}) desc`)
        .limit(10);

      const revenue = Number(kpi?.revenue ?? 0);
      const paidOrders = kpi?.paidOrders ?? 0;
      const unitsSold = topProducts.reduce((n, p) => n + Number(p.units), 0);

      return {
        range: { from: from.toISOString(), to: to.toISOString() },
        kpis: {
          revenue,
          orders: paidOrders,
          allOrders: kpi?.allOrders ?? 0,
          avgOrderValue: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
          unitsSold,
        },
        series: series.map((s) => ({ day: s.day, revenue: Number(s.revenue), orders: s.orders })),
        byStatus: byStatus.map((s) => ({ status: s.status, count: s.count, revenue: Number(s.revenue) })),
        byPayment: byPayment.map((p) => ({ method: p.method, count: p.count, revenue: Number(p.revenue) })),
        topProducts: topProducts.map((p) => ({ sku: p.sku, title: p.title, units: Number(p.units), revenue: Number(p.revenue) })),
      };
    },
  );
}
