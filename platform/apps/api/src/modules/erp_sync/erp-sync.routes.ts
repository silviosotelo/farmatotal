import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { sql } from "drizzle-orm";
import { settings, erpFieldMappings, syncRuns, branches, inventory, products } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { isModuleEnabled } from "../system/moduleState.js";
import { getAdapter, listAdapters } from "./adapters/types.js";
import type { AdapterCtx } from "./adapters/types.js";
import { importEntity } from "./generic-import.js";

async function readConfig(req: FastifyRequest): Promise<Record<string, unknown>> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tid(req)), eq(settings.key, "plugin_erp_sync")))
    .limit(1);
  return (row?.value as Record<string, unknown>) ?? {};
}

export async function erpSyncRoutes(app: FastifyInstance) {
  // Adapters disponibles (para el selector del admin).
  app.get("/erp-sync/adapters", async () => ({ data: listAdapters() }));

  // Últimas corridas de sincronización (auditoría).
  app.get("/erp-sync/runs", async () => {
    const rows = await db.select().from(syncRuns).orderBy(desc(syncRuns.createdAt)).limit(50);
    return { data: rows };
  });

  // Mapeo de campos por entidad.
  app.get(
    "/erp-sync/mappings",
    { schema: { querystring: z.object({ entity: z.string() }) } },
    async (req) => {
      const rows = await db
        .select()
        .from(erpFieldMappings)
        .where(and(eq(erpFieldMappings.tenantId, tid(req)), eq(erpFieldMappings.entity, req.query.entity)));
      return { data: rows };
    },
  );

  // Reemplaza el set de mapeos de una entidad.
  app.put(
    "/erp-sync/mappings",
    { schema: { body: z.object({ entity: z.string(), mappings: z.array(z.object({ sourceName: z.string(), targetName: z.string(), transform: z.string().nullable().optional() })) }) } },
    async (req, reply) => {
      const t = tid(req);
      await db.delete(erpFieldMappings).where(and(eq(erpFieldMappings.tenantId, t), eq(erpFieldMappings.entity, req.body.entity)));
      if (req.body.mappings.length) {
        await db.insert(erpFieldMappings).values(
          req.body.mappings.map((m: { sourceName: string; targetName: string; transform?: string | null }) => ({ tenantId: t, entity: req.body.entity, sourceName: m.sourceName, targetName: m.targetName, transform: m.transform ?? null })),
        );
      }
      return reply.send({ ok: true, count: req.body.mappings.length });
    },
  );

  // Importar ahora (productos/categorías) con el adapter activo.
  app.post(
    "/erp-sync/import",
    { schema: { body: z.object({ entity: z.enum(["products", "categories"]).default("products"), maxProducts: z.number().int().positive().optional() }) } },
    async (req, reply) => {
      if (!(await isModuleEnabled(tid(req), "erp_sync"))) return reply.badRequest("Módulo erp_sync desactivado");
      const config = await readConfig(req);
      const adapterKey = String(config.adapter ?? "");
      const adapter = getAdapter(adapterKey);
      if (!adapter) return reply.badRequest(`Adapter '${adapterKey}' no disponible`);
      const ctx: AdapterCtx = { tenantId: tid(req), config: { ...config, maxProducts: req.body.maxProducts } };
      const fn = req.body.entity === "categories" ? adapter.importCategories : adapter.importProducts;
      if (!fn) return reply.badRequest(`El adapter '${adapterKey}' no soporta importar ${req.body.entity}`);
      const records = await fn.call(adapter, ctx);
      // Adapters que upsertan internamente (ej. Woo) devuelven [] → ya quedó hecho.
      // Adapters que devuelven RawRecord[] (ej. REST genérico) pasan por el mapper +
      // upsert idempotente dirigido por erp_field_mappings.
      if (records.length > 0) {
        const r = await importEntity(tid(req), req.body.entity, adapterKey, records, `erp_sync:${adapterKey}`);
        return reply.send({ ok: true, adapter: adapterKey, entity: req.body.entity, fetched: records.length, imported: r.imported, errors: r.errors });
      }
      return reply.send({ ok: true, adapter: adapterKey, entity: req.body.entity, fetched: 0 });
    },
  );

  // Sincronizar stock de una sucursal contra el ERP (adapter.fetchStock). Acotado.
  app.post(
    "/erp-sync/sync-stock",
    { schema: { body: z.object({ branchId: z.string().uuid(), limit: z.number().int().positive().max(200).optional() }) } },
    async (req, reply) => {
      const t = tid(req);
      if (!(await isModuleEnabled(t, "erp_sync"))) return reply.badRequest("Módulo erp_sync desactivado");
      const config = await readConfig(req);
      const adapter = getAdapter(String(config.adapter ?? ""));
      if (!adapter?.fetchStock) return reply.badRequest("El adapter activo no soporta sync de stock");
      const [br] = await db.select().from(branches).where(and(eq(branches.tenantId, t), eq(branches.id, req.body.branchId))).limit(1);
      if (!br) return reply.notFound("Sucursal no encontrada");
      // SKUs con inventario en esa sucursal (acotado).
      const rows = await db
        .select({ productId: inventory.productId, sku: products.sku })
        .from(inventory)
        .innerJoin(products, eq(products.id, inventory.productId))
        .where(and(eq(inventory.tenantId, t), eq(inventory.branchId, br.id)))
        .limit(req.body.limit ?? 100);
      const bySku = new Map(rows.map((r) => [r.sku, r.productId]));
      const ctx: AdapterCtx = { tenantId: t, config };
      const stock = await adapter.fetchStock([...bySku.keys()], br.erpCode ?? null, ctx);
      let updated = 0;
      for (const [sku, qty] of Object.entries(stock)) {
        const pid = bySku.get(sku);
        if (!pid) continue;
        await db
          .update(inventory)
          .set({ stock: Math.max(0, Math.trunc(qty)), updatedAt: new Date() })
          .where(and(eq(inventory.productId, pid), eq(inventory.branchId, br.id)));
        const [{ total } = { total: 0 }] = await db
          .select({ total: sql<number>`coalesce(sum(${inventory.stock}),0)::int` })
          .from(inventory)
          .where(and(eq(inventory.tenantId, t), eq(inventory.productId, pid)));
        await db.update(products).set({ stockCached: total }).where(eq(products.id, pid));
        updated++;
      }
      return reply.send({ ok: true, branch: br.code, queried: bySku.size, updated });
    },
  );
}
