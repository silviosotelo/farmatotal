import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { sql } from "drizzle-orm";
import { options, erpFieldMappings, syncRuns, branches, inventory, products } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { isModuleEnabled } from "../system/moduleState.js";
import { getAdapter, listAdapters } from "./adapters/types.js";
import type { AdapterCtx } from "./adapters/types.js";
import { importEntity } from "./generic-import.js";

async function readConfig(req: FastifyRequest): Promise<Record<string, unknown>> {
  const [row] = await db
    .select()
    .from(options)
    .where(and(eq(options.tenantId, tid(req)), eq(options.name, "plugin_erp_sync")))
    .limit(1);
  return (row?.value as Record<string, unknown>) ?? {};
}

export async function erpSyncRoutes(app: FastifyInstance) {
  app.get("/erp-sync/adapters", async () => ({ data: listAdapters() }));

  app.get("/erp-sync/runs", async () => {
    const rows = await db.select().from(syncRuns).orderBy(desc(syncRuns.createdAt)).limit(50);
    return { data: rows };
  });

  app.get(
    "/erp-sync/mappings",
    { schema: { querystring: z.object({ entity: z.string() }) } },
    async (req) => {
      const entity = (req.query as { entity: string }).entity;
      const rows = await db
        .select()
        .from(erpFieldMappings)
        .where(and(eq(erpFieldMappings.tenantId, tid(req)), eq(erpFieldMappings.entityType, entity)));
      return { data: rows };
    },
  );

  app.put(
    "/erp-sync/mappings",
    { schema: { body: z.object({ entity: z.string(), mappings: z.array(z.object({ erpField: z.string(), platformField: z.string(), transform: z.string().nullable().optional() })) }) } },
    async (req, reply) => {
      const t = tid(req);
      const body = req.body as { entity: string; mappings: Array<{ erpField: string; platformField: string; transform?: string | null }> };
      await db.delete(erpFieldMappings).where(and(eq(erpFieldMappings.tenantId, t), eq(erpFieldMappings.entityType, body.entity)));
      if (body.mappings.length) {
        await db.insert(erpFieldMappings).values(
          body.mappings.map((m) => ({ tenantId: t, entityType: body.entity, erpField: m.erpField, platformField: m.platformField, transform: m.transform ?? null })),
        );
      }
      return reply.send({ ok: true, count: body.mappings.length });
    },
  );

  app.post(
    "/erp-sync/import",
    { schema: { body: z.object({ entity: z.enum(["products", "categories"]).default("products"), maxProducts: z.number().int().positive().optional() }) } },
    async (req, reply) => {
      if (!(await isModuleEnabled(tid(req), "erp_sync"))) return reply.badRequest("Módulo erp_sync desactivado");
      const body = req.body as { entity: string; maxProducts?: number };
      const config = await readConfig(req);
      const adapterKey = String(config.adapter ?? "");
      const adapter = getAdapter(adapterKey);
      if (!adapter) return reply.badRequest(`Adapter '${adapterKey}' no disponible`);
      const ctx: AdapterCtx = { tenantId: tid(req), config: { ...config, maxProducts: body.maxProducts } };
      const fn = body.entity === "categories" ? adapter.importCategories : adapter.importProducts;
      if (!fn) return reply.badRequest(`El adapter '${adapterKey}' no soporta importar ${body.entity}`);
      const records = await fn.call(adapter, ctx);
      if (records.length > 0) {
        const r = await importEntity(tid(req), "products", adapterKey, records, `erp_sync:${adapterKey}`);
        return reply.send({ ok: true, adapter: adapterKey, entity: body.entity, fetched: records.length, imported: r.imported, errors: r.errors });
      }
      return reply.send({ ok: true, adapter: adapterKey, entity: body.entity, fetched: 0 });
    },
  );

  app.post(
    "/erp-sync/sync-stock",
    { schema: { body: z.object({ branchId: z.string().uuid(), limit: z.number().int().positive().max(200).optional() }) } },
    async (req, reply) => {
      const t = tid(req);
      const body = req.body as { branchId: string; limit?: number };
      if (!(await isModuleEnabled(t, "erp_sync"))) return reply.badRequest("Módulo erp_sync desactivado");
      const config = await readConfig(req);
      const adapter = getAdapter(String(config.adapter ?? ""));
      if (!adapter?.fetchStock) return reply.badRequest("El adapter activo no soporta sync de stock");
      const [br] = await db.select().from(branches).where(and(eq(branches.tenantId, t), eq(branches.id, body.branchId))).limit(1);
      if (!br) return reply.notFound("Sucursal no encontrada");
      const rows = await db
        .select({ productId: inventory.productId, sku: products.sku })
        .from(inventory)
        .innerJoin(products, eq(products.id, inventory.productId))
        .where(and(eq(inventory.tenantId, t), eq(inventory.branchId, br.id)))
        .limit(body.limit ?? 100);
      const bySku = new Map(rows.filter((r) => r.sku).map((r) => [r.sku!, r.productId]));
      const ctx: AdapterCtx = { tenantId: t, config };
      const stock = await adapter.fetchStock([...bySku.keys()], br.erpId ?? null, ctx);
      let updated = 0;
      for (const [sku, qty] of Object.entries(stock)) {
        const pid = bySku.get(sku);
        if (!pid) continue;
        await db
          .update(inventory)
          .set({ onHand: String(Math.max(0, Math.trunc(qty))), updatedAt: new Date() })
          .where(and(eq(inventory.productId, pid), eq(inventory.branchId, br.id)));
        const [{ total } = { total: 0 }] = await db
          .select({ total: sql<number>`coalesce(sum(${inventory.onHand}),0)::int` })
          .from(inventory)
          .where(and(eq(inventory.tenantId, t), eq(inventory.productId, pid)));
        await db.update(products).set({ totalSales: total }).where(eq(products.id, pid));
        updated++;
      }
      return reply.send({ ok: true, branch: br.code, queried: bySku.size, updated });
    },
  );
}
