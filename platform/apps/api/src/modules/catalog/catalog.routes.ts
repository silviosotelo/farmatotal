import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  brandDTO,
  brandInput,
  categoryDTO,
  categoryInput,
  paginated,
  productDTO,
  productInput,
  productListQuery,
  productListResponse,
} from "@platform/shared-types";
import { z } from "zod";
import { db } from "../../db/client";
import { brands, categories, productImages, products } from "../../db/schema";
import { tid } from "../../plugins/tenant";

const idParam = z.object({ id: z.string().uuid() });

export async function catalogRoutes(app: FastifyInstance) {
  // ============ CATEGORIES ============
  // Lista plana. Filtros: ?parentId=null → solo departamentos top-level;
  // ?parentId=<uuid> → subcategorías de ese departamento; sin filtro → todas.
  app.get(
    "/catalog/categories",
    {
      schema: {
        querystring: z.object({ parentId: z.string().optional() }),
        response: { 200: paginated(categoryDTO) },
      },
    },
    async (req) => {
      const { parentId } = req.query as { parentId?: string };
      const where = and(
        eq(categories.tenantId, tid(req)),
        parentId === "null" ? isNull(categories.parentId) : parentId ? eq(categories.parentId, parentId) : undefined,
      );
      const rows = await db
        .select()
        .from(categories)
        .where(where)
        .orderBy(asc(categories.position), asc(categories.name));
      return {
        data: rows.map(toCategoryDTO),
        page: 1,
        perPage: rows.length,
        total: rows.length,
        totalPages: 1,
      };
    },
  );

  // Árbol jerárquico de categorías (departamentos → subcategorías).
  app.get("/catalog/categories/tree", async (req) => {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tid(req)))
      .orderBy(asc(categories.position), asc(categories.name));
    type Node = ReturnType<typeof toCategoryDTO> & { children: Node[] };
    const byId = new Map<string, Node>(rows.map((r) => [r.id, { ...toCategoryDTO(r), children: [] }]));
    const roots: Node[] = [];
    for (const node of byId.values()) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return { data: roots, total: roots.length };
  });

  app.post(
    "/catalog/categories",
    { schema: { body: categoryInput, response: { 200: categoryDTO } } },
    async (req, reply) => {
      const [row] = await db.insert(categories).values({ ...req.body, tenantId: tid(req) }).returning();
      return reply.send(toCategoryDTO(row!));
    },
  );

  app.patch(
    "/catalog/categories/:id",
    { schema: { params: idParam, body: categoryInput.partial(), response: { 200: categoryDTO } } },
    async (req, reply) => {
      const [row] = await db
        .update(categories)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(categories.id, req.params.id))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(toCategoryDTO(row));
    },
  );

  app.delete(
    "/catalog/categories/:id",
    { schema: { params: idParam } },
    async (req, reply) => {
      await db.delete(categories).where(eq(categories.id, req.params.id));
      return reply.send({ ok: true });
    },
  );

  // ============ BRANDS ============
  app.get(
    "/catalog/brands",
    { schema: { response: { 200: paginated(brandDTO) } } },
    async (req) => {
      const rows = await db.select().from(brands).where(eq(brands.tenantId, tid(req))).orderBy(asc(brands.name));
      return {
        data: rows.map(toBrandDTO),
        page: 1,
        perPage: rows.length,
        total: rows.length,
        totalPages: 1,
      };
    },
  );

  app.post(
    "/catalog/brands",
    { schema: { body: brandInput, response: { 200: brandDTO } } },
    async (req, reply) => {
      const [row] = await db.insert(brands).values({ ...req.body, tenantId: tid(req) }).returning();
      return reply.send(toBrandDTO(row!));
    },
  );

  // ============ PRODUCTS ============
  app.get(
    "/catalog/products",
    { schema: { querystring: productListQuery, response: { 200: productListResponse } } },
    async (req) => {
      const {
        page,
        perPage,
        offset,
        q,
        categoryId,
        brandId,
        category,
        brand,
        ids: idsCsv,
        status,
        featured,
        onPromo,
        inStock,
        priceMin,
        priceMax,
        sort,
      } = req.query;

      // Filtros por slug (los emite el constructor). Se resuelven a id.
      let catId = categoryId;
      if (!catId && category) {
        const [c] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.tenantId, tid(req)), eq(categories.slug, category)))
          .limit(1);
        catId = c?.id;
      }
      let brId = brandId;
      if (!brId && brand) {
        const [b] = await db
          .select({ id: brands.id })
          .from(brands)
          .where(and(eq(brands.tenantId, tid(req)), eq(brands.slug, brand)))
          .limit(1);
        brId = b?.id;
      }

      // Al filtrar por categoría, incluir sus descendientes: elegir un
      // departamento (top-level) trae los productos de todas sus subcategorías.
      let catIds: string[] | undefined;
      if (catId) {
        const all = await db
          .select({ id: categories.id, parentId: categories.parentId })
          .from(categories)
          .where(eq(categories.tenantId, tid(req)));
        const childrenOf = new Map<string, string[]>();
        for (const c of all) {
          if (c.parentId) {
            const arr = childrenOf.get(c.parentId) ?? [];
            arr.push(c.id);
            childrenOf.set(c.parentId, arr);
          }
        }
        const acc = [catId];
        const stack = [catId];
        while (stack.length) {
          const cur = stack.pop()!;
          for (const ch of childrenOf.get(cur) ?? []) {
            acc.push(ch);
            stack.push(ch);
          }
        }
        catIds = acc;
      }

      // Selección manual (Elementor "Manual selection"): ids separados por coma.
      const manualIds = (idsCsv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const where = and(
        eq(products.tenantId, tid(req)),
        q
          ? or(
              ilike(products.title, `%${q}%`),
              ilike(products.sku, `%${q}%`),
              ilike(products.codInterno, `%${q}%`),
            )
          : undefined,
        manualIds.length ? inArray(products.id, manualIds) : undefined,
        catIds ? inArray(products.categoryId, catIds) : undefined,
        brId ? eq(products.brandId, brId) : undefined,
        status ? eq(products.status, status) : undefined,
        featured !== undefined ? eq(products.featured, featured) : undefined,
        onPromo !== undefined ? eq(products.onPromo, onPromo) : undefined,
        inStock ? gt(products.stockCached, 0) : undefined,
        priceMin !== undefined ? gte(products.priceWeb, priceMin) : undefined,
        priceMax !== undefined ? lte(products.priceWeb, priceMax) : undefined,
      );

      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(where);

      const orderBy = (() => {
        switch (sort) {
          case "createdAt:asc":
            return asc(products.createdAt);
          case "title:asc":
            return asc(products.title);
          case "title:desc":
            return desc(products.title);
          case "priceWeb:asc":
            return asc(products.priceWeb);
          case "priceWeb:desc":
            return desc(products.priceWeb);
          case "random":
            return sql`random()`;
          default:
            return desc(products.createdAt);
        }
      })();

      const skip = offset ?? (page - 1) * perPage;
      const rows = await db
        .select()
        .from(products)
        .where(where)
        .orderBy(orderBy)
        .limit(perPage)
        .offset(skip);

      // Adjuntar la imagen primaria de cada producto al listado (1 query).
      const ids = rows.map((r) => r.id);
      const imgs = ids.length
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, ids))
            .orderBy(asc(productImages.position))
        : [];
      const imgByProduct = new Map<string, (typeof imgs)[number]>();
      for (const im of imgs) {
        if (!imgByProduct.has(im.productId)) imgByProduct.set(im.productId, im);
      }

      return {
        data: rows.map((r) => {
          const dto = toProductDTO(r);
          const im = imgByProduct.get(r.id);
          return im ? { ...dto, images: [toImageDTO(im)] } : dto;
        }),
        page,
        perPage,
        total: count,
        totalPages: Math.ceil(count / perPage),
      };
    },
  );

  app.get(
    "/catalog/products/:id",
    { schema: { params: idParam, response: { 200: productDTO } } },
    async (req, reply) => {
      const [p] = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tid(req)), eq(products.id, req.params.id)))
        .limit(1);
      if (!p) return reply.notFound();
      const imgs = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, p.id))
        .orderBy(asc(productImages.position));
      return reply.send({ ...toProductDTO(p), images: imgs.map(toImageDTO) });
    },
  );

  app.get(
    "/catalog/products/by-slug/:slug",
    {
      schema: { params: z.object({ slug: z.string() }), response: { 200: productDTO } },
    },
    async (req, reply) => {
      const [p] = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tid(req)), eq(products.slug, req.params.slug)))
        .limit(1);
      if (!p) return reply.notFound();
      const imgs = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, p.id))
        .orderBy(asc(productImages.position));
      return reply.send({ ...toProductDTO(p), images: imgs.map(toImageDTO) });
    },
  );

  app.post(
    "/catalog/products",
    { schema: { body: productInput, response: { 200: productDTO } } },
    async (req, reply) => {
      const [row] = await db.insert(products).values({ ...req.body, tenantId: tid(req) }).returning();
      return reply.send(toProductDTO(row!));
    },
  );

  app.patch(
    "/catalog/products/:id",
    { schema: { params: idParam, body: productInput.partial(), response: { 200: productDTO } } },
    async (req, reply) => {
      const [row] = await db
        .update(products)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(eq(products.tenantId, tid(req)), eq(products.id, req.params.id)))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(toProductDTO(row));
    },
  );

  app.delete(
    "/catalog/products/:id",
    { schema: { params: idParam } },
    async (req, reply) => {
      await db.delete(products).where(and(eq(products.tenantId, tid(req)), eq(products.id, req.params.id)));
      return reply.send({ ok: true });
    },
  );
}

// ---------- mappers ----------
function toCategoryDTO(r: typeof categories.$inferSelect) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    parentId: r.parentId ?? null,
    position: r.position,
    fliaCodigo: r.fliaCodigo ?? null,
    icon: r.icon ?? null,
    description: r.description ?? null,
    seo: r.seo ?? null,
    active: r.active,
  };
}
function toBrandDTO(r: typeof brands.$inferSelect) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    logoUrl: r.logoUrl ?? null,
    description: r.description ?? null,
    active: r.active,
  };
}
function toProductDTO(r: typeof products.$inferSelect) {
  return {
    id: r.id,
    sku: r.sku,
    codInterno: r.codInterno ?? null,
    slug: r.slug,
    title: r.title,
    description: r.description ?? null,
    brandId: r.brandId ?? null,
    categoryId: r.categoryId ?? null,
    priceNormal: r.priceNormal,
    priceWeb: r.priceWeb,
    unit: r.unit,
    unitStep: r.unitStep,
    onPromo: r.onPromo,
    promoCode: r.promoCode ?? null,
    controlled: r.controlled,
    featured: r.featured,
    status: r.status,
    productType: r.productType,
    attributes: r.attributes ?? null,
    stockCached: r.stockCached,
    custom: r.custom ?? null,
    seo: r.seo ?? null,
    erpSourced: r.erpSourced,
    sourceSystem: r.sourceSystem ?? null,
    sourceId: r.sourceId ?? null,
    syncedAt: r.syncedAt ? r.syncedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
function toImageDTO(r: typeof productImages.$inferSelect) {
  return {
    id: r.id,
    url: r.url,
    alt: r.alt ?? null,
    position: r.position,
    isPrimary: r.isPrimary,
  };
}
