import type { FastifyInstance } from "fastify";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { branches, products } from "../../db/schema";
import { queryErpStock } from "../../services/erp-stock";
import { tid } from "../../plugins/tenant";

export async function stockRoutes(app: FastifyInstance) {
  // Stock en vivo de un SKU en una sucursal (por erpCode directo)
  app.get(
    "/stock/live",
    {
      schema: {
        querystring: z.object({
          sku: z.string(),
          erpCode: z.string(),
          quantity: z.coerce.number().int().positive().default(1),
        }),
      },
    },
    async (req, reply) => {
      const { sku, erpCode, quantity } = req.query;
      const r = await queryErpStock(erpCode, sku, quantity);
      if (!r.success) return reply.code(502).send({ ok: false, error: "ERP no disponible" });
      const line = r.value?.[0];
      return reply.send({
        ok: true,
        sku,
        erpCode,
        stock: line?.stk_cant_act ?? 0,
        hasStock: line?.has_stock === "true",
        description: line?.stk_descripcion ?? null,
        message: line?.message ?? null,
      });
    },
  );

  // Stock en vivo de un SKU en TODAS las sucursales que tienen erpCode configurado
  app.get(
    "/stock/live-by-sku/:sku",
    { schema: { params: z.object({ sku: z.string() }) } },
    async (req, reply) => {
      const { sku } = req.params;
      const withErp = await db
        .select({ id: branches.id, name: branches.name, erpCode: branches.erpCode })
        .from(branches)
        .where(and(eq(branches.tenantId, tid(req)), eq(branches.active, true), isNotNull(branches.erpCode)))
        .limit(60);

      if (withErp.length === 0) {
        return reply.send({
          ok: true,
          sku,
          note: "Ninguna sucursal tiene erpCode configurado todavía",
          branches: [],
        });
      }

      const results = await Promise.all(
        withErp.map(async (b) => {
          const r = await queryErpStock(b.erpCode!, sku, 1);
          const line = r.value?.[0];
          return {
            branchId: b.id,
            branchName: b.name,
            erpCode: b.erpCode,
            stock: line?.stk_cant_act ?? 0,
            hasStock: line?.has_stock === "true",
          };
        }),
      );
      return reply.send({ ok: true, sku, branches: results });
    },
  );

  // Stock en vivo por productId (resuelve el SKU)
  app.get(
    "/stock/live-product/:id",
    { schema: { params: z.object({ id: z.string().uuid() }), querystring: z.object({ erpCode: z.string() }) } },
    async (req, reply) => {
      const [p] = await db.select({ sku: products.sku }).from(products).where(eq(products.id, req.params.id)).limit(1);
      if (!p) return reply.notFound();
      const r = await queryErpStock(req.query.erpCode, p.sku, 1);
      const line = r.value?.[0];
      return reply.send({
        ok: r.success,
        sku: p.sku,
        stock: line?.stk_cant_act ?? 0,
        hasStock: line?.has_stock === "true",
      });
    },
  );
}
