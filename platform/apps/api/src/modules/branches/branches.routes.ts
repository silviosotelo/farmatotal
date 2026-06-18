import type { FastifyInstance } from "fastify";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { branches, inventory, products } from "../../db/schema";

const branchInput = z.object({
  code: z.string().min(1).max(40),
  erpCode: z.string().max(20).nullable().optional(),
  name: z.string().min(1).max(200),
  address: z.string().nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  active: z.boolean().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export async function branchRoutes(app: FastifyInstance) {
  app.get("/branches", async () => {
    const rows = await db.select().from(branches).orderBy(branches.name);
    return { data: rows, total: rows.length };
  });

  app.post("/branches", { schema: { body: branchInput } }, async (req, reply) => {
    const [row] = await db.insert(branches).values(req.body).returning();
    return reply.send(row);
  });

  app.patch(
    "/branches/:id",
    { schema: { params: idParam, body: branchInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(branches)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(branches.id, req.params.id))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );

  // ---- Inventario ----
  app.get(
    "/branches/:id/inventory",
    { schema: { params: idParam } },
    async (req) => {
      const rows = await db
        .select({
          productId: inventory.productId,
          stock: inventory.stock,
          reserved: inventory.reserved,
          sku: products.sku,
          title: products.title,
        })
        .from(inventory)
        .innerJoin(products, eq(products.id, inventory.productId))
        .where(eq(inventory.branchId, req.params.id))
        .limit(500);
      return { data: rows, total: rows.length };
    },
  );

  // Stock de un producto en TODAS las sucursales (para el editor de inventario)
  app.get(
    "/inventory/product/:productId",
    { schema: { params: z.object({ productId: z.string().uuid() }) } },
    async (req) => {
      const all = await db.select().from(branches).orderBy(branches.name);
      const inv = await db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, req.params.productId));
      const byBranch = new Map(inv.map((i) => [i.branchId, i]));
      return {
        data: all.map((b) => ({
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          stock: byBranch.get(b.id)?.stock ?? 0,
          reserved: byBranch.get(b.id)?.reserved ?? 0,
        })),
      };
    },
  );

  // Stock disponible de varios SKUs en UNA sucursal (batch para el catálogo).
  // GET (lectura) → { sku: disponible } donde disponible = stock - reservado.
  app.get(
    "/inventory/stock-by-branch",
    {
      schema: {
        querystring: z.object({
          branch: z.string().min(1), // code o erpCode de la sucursal
          skus: z.string().min(1), // SKUs separados por coma
        }),
      },
    },
    async (req) => {
      const { branch, skus } = req.query as { branch: string; skus: string };
      const skuList = skus.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
      if (skuList.length === 0) return { branch, stock: {} as Record<string, number> };

      const [b] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(or(eq(branches.code, branch), eq(branches.erpCode, branch)))
        .limit(1);
      if (!b) return { branch, stock: {} as Record<string, number> };

      const rows = await db
        .select({
          sku: products.sku,
          stock: inventory.stock,
          reserved: inventory.reserved,
        })
        .from(inventory)
        .innerJoin(products, eq(products.id, inventory.productId))
        .where(and(eq(inventory.branchId, b.id), inArray(products.sku, skuList)));

      const stock: Record<string, number> = {};
      for (const r of rows) stock[r.sku] = Math.max(0, (r.stock ?? 0) - (r.reserved ?? 0));
      return { branch, stock };
    },
  );

  const invInput = z.object({
    productId: z.string().uuid(),
    branchId: z.string().uuid(),
    stock: z.number().int().nonnegative(),
  });

  app.put("/inventory", { schema: { body: invInput } }, async (req, reply) => {
    const { productId, branchId, stock } = req.body;
    await db
      .insert(inventory)
      .values({ productId, branchId, stock })
      .onConflictDoUpdate({
        target: [inventory.productId, inventory.branchId],
        set: { stock, updatedAt: new Date() },
      });
    // recalc stock cacheado
    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`coalesce(sum(${inventory.stock}),0)::int` })
      .from(inventory)
      .where(eq(inventory.productId, productId));
    await db.update(products).set({ stockCached: total }).where(eq(products.id, productId));
    return reply.send({ ok: true, stockCached: total });
  });

  // ── Multi-inventario: export CSV (sku, sucursal, stock) ──
  app.get("/inventory/export", async (_req, reply) => {
    const rows = await db
      .select({ sku: products.sku, branchCode: branches.code, branchName: branches.name, stock: inventory.stock })
      .from(inventory)
      .innerJoin(products, eq(products.id, inventory.productId))
      .innerJoin(branches, eq(branches.id, inventory.branchId))
      .limit(50000);
    const head = "sku,branch_code,branch_name,stock";
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map((r) => [r.sku, r.branchCode, r.branchName, r.stock].map(esc).join(",")).join("\n");
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", 'attachment; filename="inventario.csv"');
    return reply.send(`${head}\n${body}`);
  });

  // ── Multi-inventario: import (filas {sku, branchCode, stock}) ──
  app.post(
    "/inventory/import",
    {
      bodyLimit: 20 * 1024 * 1024,
      schema: { body: z.object({ rows: z.array(z.object({ sku: z.string(), branchCode: z.string(), stock: z.coerce.number().int().nonnegative() })) }) },
    },
    async (req, reply) => {
      const all = await db.select({ id: products.id, sku: products.sku }).from(products);
      const prodBySku = new Map(all.map((p) => [p.sku, p.id]));
      const allB = await db.select({ id: branches.id, code: branches.code }).from(branches);
      const branchByCode = new Map(allB.map((b) => [b.code, b.id]));
      let ok = 0;
      const errors: string[] = [];
      const touched = new Set<string>();
      for (const r of req.body.rows) {
        const pid = prodBySku.get(r.sku);
        const bid = branchByCode.get(r.branchCode);
        if (!pid || !bid) {
          errors.push(`${r.sku}/${r.branchCode}: ${!pid ? "SKU" : "sucursal"} no encontrado`);
          continue;
        }
        await db
          .insert(inventory)
          .values({ productId: pid, branchId: bid, stock: r.stock })
          .onConflictDoUpdate({ target: [inventory.productId, inventory.branchId], set: { stock: r.stock, updatedAt: new Date() } });
        touched.add(pid);
        ok++;
      }
      // recalc stockCached de los productos tocados
      for (const pid of touched) {
        const [{ total } = { total: 0 }] = await db
          .select({ total: sql<number>`coalesce(sum(${inventory.stock}),0)::int` })
          .from(inventory)
          .where(eq(inventory.productId, pid));
        await db.update(products).set({ stockCached: total }).where(eq(products.id, pid));
      }
      return reply.send({ ok, failed: errors.length, errors: errors.slice(0, 50) });
    },
  );
}
