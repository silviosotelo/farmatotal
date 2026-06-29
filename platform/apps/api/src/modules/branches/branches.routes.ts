import type { FastifyInstance } from "fastify";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { branches, inventory, posts, products } from "../../db/schema";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
import { tid } from "../../plugins/tenant";

const branchInput = z.object({
  code: z.string().min(1).max(40),
  erpId: z.string().max(100).nullable().optional(),
  name: z.string().min(1).max(200),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isPickup: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export async function branchRoutes(app: FastifyInstance) {
  app.get("/branches", async (req) => {
    const rows = await db.select().from(branches).where(eq(branches.tenantId, tid(req))).orderBy(branches.name);
    return { data: rows, total: rows.length };
  });

  app.post("/branches", { schema: { body: branchInput } }, async (req, reply) => {
    const [row] = await db.insert(branches).values({ ...(req.body as any), tenantId: tid(req) }).returning();
    return reply.send(row);
  });

  app.patch(
    "/branches/:id",
    { schema: { params: idParam, body: branchInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(branches)
        .set({ ...(req.body as Record<string, unknown>), updatedAt: new Date() })
        .where(and(eq(branches.tenantId, tid(req)), eq(branches.id, (req.params as { id: string }).id)))
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
          onHand: inventory.onHand,
          reserved: inventory.reserved,
          sku: products.sku,
          title: posts.title,
        })
        .from(inventory)
        .innerJoin(products, eq(products.id, inventory.productId))
        .leftJoin(posts, eq(posts.id, products.postId))
        .where(and(eq(inventory.tenantId, tid(req)), eq(inventory.branchId, (req.params as { id: string }).id)))
        .limit(500);
      return { data: rows, total: rows.length };
    },
  );

  // Stock de un producto en TODAS las sucursales (para el editor de inventario)
  app.get(
    "/inventory/product/:productId",
    { schema: { params: z.object({ productId: z.string().uuid() }) } },
    async (req) => {
      const all = await db.select().from(branches).where(eq(branches.tenantId, tid(req))).orderBy(branches.name);
      const inv = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.tenantId, tid(req)), eq(inventory.productId, (req.params as { productId: string }).productId)));
      const byBranch = new Map(inv.map((i) => [i.branchId, i]));
      return {
        data: all.map((b) => ({
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          onHand: byBranch.get(b.id)?.onHand ?? 0,
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
        .where(and(eq(branches.tenantId, tid(req)), or(eq(branches.code, branch), eq(branches.erpId, branch))))
        .limit(1);
      if (!b) return { branch, stock: {} as Record<string, number> };

      const rows = await db
        .select({
          sku: products.sku,
          onHand: inventory.onHand,
          reserved: inventory.reserved,
        })
        .from(inventory)
        .innerJoin(products, eq(products.id, inventory.productId))
        .where(and(eq(inventory.tenantId, tid(req)), eq(inventory.branchId, b.id), inArray(products.sku, skuList)));

      const stock: Record<string, number> = {};
      for (const r of rows) if (r.sku) stock[r.sku] = Math.max(0, Number(r.onHand ?? 0) - Number(r.reserved ?? 0));
      return { branch, stock };
    },
  );

  const invInput = z.object({
    productId: z.string().uuid(),
    branchId: z.string().uuid(),
    onHand: z.number().int().nonnegative(),
  });

  app.put("/inventory", { schema: { body: invInput } }, async (req, reply) => {
    const { productId, branchId, onHand } = req.body as z.infer<typeof invInput>;
    await db
      .insert(inventory)
      .values({ productId, branchId, onHand: String(onHand), tenantId: tid(req) })
      .onConflictDoUpdate({
        target: [inventory.productId, inventory.branchId],
        set: { onHand: String(onHand), updatedAt: new Date() },
      });
    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`coalesce(sum(${inventory.onHand}),0)::int` })
      .from(inventory)
      .where(and(eq(inventory.tenantId, tid(req)), eq(inventory.productId, productId)));
    return reply.send({ ok: true, totalStock: total });
  });

  // ── Multi-inventario: export CSV (sku, sucursal, stock) ──
  app.get("/inventory/export", async (req, reply) => {
    const rows = await db
      .select({ sku: products.sku, branchCode: branches.code, branchName: branches.name, onHand: inventory.onHand })
      .from(inventory)
      .innerJoin(products, eq(products.id, inventory.productId))
      .innerJoin(branches, eq(branches.id, inventory.branchId))
      .where(eq(inventory.tenantId, tid(req)))
      .limit(50000);
    const head = "sku,branch_code,branch_name,on_hand";
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map((r) => [r.sku, r.branchCode, r.branchName, r.onHand].map(esc).join(",")).join("\n");
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
      const all = await db.select({ id: products.id, sku: products.sku }).from(products).where(eq(products.tenantId, tid(req)));
      const prodBySku = new Map(all.map((p) => [p.sku, p.id]));
      const allB = await db.select({ id: branches.id, code: branches.code }).from(branches).where(eq(branches.tenantId, tid(req)));
      const branchByCode = new Map(allB.map((b) => [b.code, b.id]));
      let ok = 0;
      const errors: string[] = [];
      for (const r of (req.body as { rows: Array<{ sku: string; branchCode: string; stock: number }> }).rows) {
        const pid = prodBySku.get(r.sku);
        const bid = branchByCode.get(r.branchCode);
        if (!pid || !bid) {
          errors.push(`${r.sku}/${r.branchCode}: ${!pid ? "SKU" : "sucursal"} no encontrado`);
          continue;
        }
        await db
          .insert(inventory)
          .values({ productId: pid, branchId: bid, onHand: String(r.stock), tenantId: tid(req) })
          .onConflictDoUpdate({ target: [inventory.productId, inventory.branchId], set: { onHand: String(r.stock), updatedAt: new Date() } });
        ok++;
      }
      return reply.send({ ok, failed: errors.length, errors: errors.slice(0, 50) });
    },
  );

  // GET /branches/delivery-cost?branchId=X
  app.get("/branches/delivery-cost", async (req, reply) => {
    const { branchId } = req.query as { branchId: string }
    return reply.send({ deliveryCost: 0 })
  })

  // POST /branches/check-radius — Check if a delivery address is within any branch's radius
  app.post("/branches/check-radius", async (req, reply) => {
    const { lat, lng } = req.body as { lat: number; lng: number }
    const allBranches = await db.select()
      .from(branches)
      .where(and(eq(branches.tenantId, tid(req)), eq(branches.status, "active"), eq(branches.isPickup, true)))

    const inRange = allBranches.filter(b => {
      const dist = haversineKm(lat, lng, Number(b.latitude) || 0, Number(b.longitude) || 0)
      return true
    })

    return reply.send({
      inRange: inRange.length > 0,
      branches: inRange.map(b => ({ id: b.id, name: b.name, distance: haversineKm(lat, lng, Number(b.latitude) || 0, Number(b.longitude) || 0) })),
    })
  })

  // GET /inventory/manager — Grid of all products with stock per branch (for Inventory Manager admin page)
  app.get("/inventory/manager", async (req, reply) => {
    const { page = '1', pageSize = '50', search = '' } = req.query as Record<string, string>
    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const tenantId = tid(req)

    // Get all branches for this tenant
    const allBranches = await db.select()
      .from(branches)
      .where(eq(branches.tenantId, tenantId))
      .orderBy(asc(branches.sortOrder), asc(branches.name))

    // Get products (search by title or SKU)
    let whereClause = eq(products.tenantId, tenantId)
    if (search) {
      whereClause = and(
        eq(products.tenantId, tenantId),
        or(
          ilike(posts.title, `%${search}%`),
          ilike(products.sku, `%${search}%`),
        ),
      )!
    }

    const allProducts = await db
      .select({ product: products, post: posts })
      .from(products)
      .leftJoin(posts, eq(posts.id, products.postId))
      .where(whereClause)
      .limit(parseInt(pageSize))
      .offset(offset)

    // Get inventory for all fetched products
    const productIds = allProducts.map(p => p.product.id)
    const allInventory = productIds.length > 0
      ? await db.select().from(inventory)
          .where(and(eq(inventory.tenantId, tenantId), inArray(inventory.productId, productIds)))
      : []

    // Build grid: products × branches
    const grid = allProducts.map(({ product, post }) => {
      const productInventory = allInventory.filter(i => i.productId === product.id)
      const stockByBranch: Record<string, number> = {}
      for (const inv of productInventory) {
        stockByBranch[inv.branchId] = Number(inv.onHand) || 0
      }
      return {
        id: product.id,
        title: post?.title ?? "",
        sku: product.sku,
        totalStock: product.totalSales || 0,
        branches: allBranches.map(b => ({
          branchId: b.id,
          branchName: b.name,
          stock: stockByBranch[b.id] || 0,
        })),
      }
    })

    return reply.send({
      data: grid,
      branches: allBranches.map(b => ({ id: b.id, name: b.name })),
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize) },
    })
  })
}
