import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
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
import {
  media,
  posts,
  productImages,
  products,
  termRelationships,
  terms,
  termTaxonomy,
} from "../../db/schema";
import { tid } from "../../plugins/tenant";

const idParam = z.object({ id: z.string().uuid() });

export async function catalogRoutes(app: FastifyInstance) {
  // ============ CATEGORIES (termTaxonomy WHERE taxonomy = 'product_cat') ============
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
        eq(termTaxonomy.tenantId, tid(req)),
        eq(termTaxonomy.taxonomy, "product_cat"),
        parentId === "null"
          ? isNull(termTaxonomy.parentId)
          : parentId
            ? eq(termTaxonomy.parentId, parentId)
            : undefined,
      );
      const rows = await db
        .select({
          id: termTaxonomy.id,
          name: terms.name,
          slug: terms.slug,
          description: termTaxonomy.description,
          parentId: termTaxonomy.parentId,
        })
        .from(termTaxonomy)
        .innerJoin(terms, eq(terms.id, termTaxonomy.termId))
        .where(where)
        .orderBy(asc(terms.name));
      return {
        data: rows.map(toCategoryDTO),
        page: 1,
        perPage: rows.length,
        total: rows.length,
        totalPages: 1,
      };
    },
  );

  app.get("/catalog/categories/tree", async (req) => {
    const rows = await db
      .select({
        id: termTaxonomy.id,
        name: terms.name,
        slug: terms.slug,
        description: termTaxonomy.description,
        parentId: termTaxonomy.parentId,
      })
      .from(termTaxonomy)
      .innerJoin(terms, eq(terms.id, termTaxonomy.termId))
      .where(and(eq(termTaxonomy.tenantId, tid(req)), eq(termTaxonomy.taxonomy, "product_cat")))
      .orderBy(asc(terms.name));
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
      const { name, slug, description, parentId } = req.body;
      const [term] = await db
        .insert(terms)
        .values({ tenantId: tid(req), name, slug })
        .returning();
      const [tt] = await db
        .insert(termTaxonomy)
        .values({
          tenantId: tid(req),
          termId: term!.id,
          taxonomy: "product_cat",
          description: description ?? null,
          parentId: parentId ?? null,
        })
        .returning();
      return reply.send(
        toCategoryDTO({
          id: tt!.id,
          name: term!.name,
          slug: term!.slug,
          description: tt!.description,
          parentId: tt!.parentId,
        }),
      );
    },
  );

  app.patch(
    "/catalog/categories/:id",
    { schema: { params: idParam, body: categoryInput.partial(), response: { 200: categoryDTO } } },
    async (req, reply) => {
      const [tt] = await db
        .update(termTaxonomy)
        .set({
          ...(req.body.description !== undefined && { description: req.body.description }),
          ...(req.body.parentId !== undefined && { parentId: req.body.parentId }),
          updatedAt: new Date(),
        })
        .where(and(eq(termTaxonomy.tenantId, tid(req)), eq(termTaxonomy.id, req.params.id)))
        .returning();
      if (!tt) return reply.notFound();
      if (req.body.name || req.body.slug) {
        await db
          .update(terms)
          .set({
            ...(req.body.name && { name: req.body.name }),
            ...(req.body.slug && { slug: req.body.slug }),
            updatedAt: new Date(),
          })
          .where(eq(terms.id, tt.termId));
      }
      const [term] = await db.select().from(terms).where(eq(terms.id, tt.termId)).limit(1);
      return reply.send(
        toCategoryDTO({
          id: tt.id,
          name: term!.name,
          slug: term!.slug,
          description: tt.description,
          parentId: tt.parentId,
        }),
      );
    },
  );

  app.delete(
    "/catalog/categories/:id",
    { schema: { params: idParam } },
    async (req, reply) => {
      await db
        .delete(termTaxonomy)
        .where(and(eq(termTaxonomy.tenantId, tid(req)), eq(termTaxonomy.id, req.params.id)));
      return reply.send({ ok: true });
    },
  );

  // ============ BRANDS (termTaxonomy WHERE taxonomy = 'product_brand') ============
  app.get(
    "/catalog/brands",
    { schema: { response: { 200: paginated(brandDTO) } } },
    async (req) => {
      const rows = await db
        .select({
          id: termTaxonomy.id,
          name: terms.name,
          slug: terms.slug,
          description: termTaxonomy.description,
        })
        .from(termTaxonomy)
        .innerJoin(terms, eq(terms.id, termTaxonomy.termId))
        .where(and(eq(termTaxonomy.tenantId, tid(req)), eq(termTaxonomy.taxonomy, "product_brand")))
        .orderBy(asc(terms.name));
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
      const { name, slug, description } = req.body;
      const [term] = await db
        .insert(terms)
        .values({ tenantId: tid(req), name, slug })
        .returning();
      const [tt] = await db
        .insert(termTaxonomy)
        .values({
          tenantId: tid(req),
          termId: term!.id,
          taxonomy: "product_brand",
          description: description ?? null,
        })
        .returning();
      return reply.send(
        toBrandDTO({
          id: tt!.id,
          name: term!.name,
          slug: term!.slug,
          description: tt!.description,
        }),
      );
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
        priceMin,
        priceMax,
        sort,
      } = req.query;

      let catId = categoryId;
      if (!catId && category) {
        const [c] = await db
          .select({ id: termTaxonomy.id })
          .from(termTaxonomy)
          .innerJoin(terms, eq(terms.id, termTaxonomy.termId))
          .where(
            and(
              eq(termTaxonomy.tenantId, tid(req)),
              eq(termTaxonomy.taxonomy, "product_cat"),
              eq(terms.slug, category),
            ),
          )
          .limit(1);
        catId = c?.id;
      }
      let brId = brandId;
      if (!brId && brand) {
        const [b] = await db
          .select({ id: termTaxonomy.id })
          .from(termTaxonomy)
          .innerJoin(terms, eq(terms.id, termTaxonomy.termId))
          .where(
            and(
              eq(termTaxonomy.tenantId, tid(req)),
              eq(termTaxonomy.taxonomy, "product_brand"),
              eq(terms.slug, brand),
            ),
          )
          .limit(1);
        brId = b?.id;
      }

      let catIds: string[] | undefined;
      if (catId) {
        const all = await db
          .select({ id: termTaxonomy.id, parentId: termTaxonomy.parentId })
          .from(termTaxonomy)
          .where(and(eq(termTaxonomy.tenantId, tid(req)), eq(termTaxonomy.taxonomy, "product_cat")));
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

      const manualIds = (idsCsv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let productIdsByTerm: string[] | undefined;
      const termIds: string[] = [];
      if (catIds) termIds.push(...catIds);
      if (brId) termIds.push(brId);
      if (termIds.length) {
        const rels = await db
          .select({ objectId: termRelationships.objectId })
          .from(termRelationships)
          .where(
            and(
              eq(termRelationships.tenantId, tid(req)),
              eq(termRelationships.objectType, "product"),
              inArray(termRelationships.termTaxonomyId, termIds),
            ),
          );
        productIdsByTerm = [...new Set(rels.map((r) => r.objectId))];
      }

      const where = and(
        eq(products.tenantId, tid(req)),
        q
          ? or(
              ilike(products.sku, `%${q}%`),
              ilike(products.barcode, `%${q}%`),
              inArray(
                products.postId,
                db.select({ id: posts.id }).from(posts).where(ilike(posts.title, `%${q}%`)),
              ),
            )
          : undefined,
        manualIds.length ? inArray(products.id, manualIds) : undefined,
        productIdsByTerm ? inArray(products.id, productIdsByTerm) : undefined,
        status ? eq(products.status, status) : undefined,
        featured !== undefined ? eq(products.featured, featured) : undefined,
        priceMin !== undefined ? gte(products.salePrice, String(priceMin)) : undefined,
        priceMax !== undefined ? lte(products.salePrice, String(priceMax)) : undefined,
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
            return asc(posts.title);
          case "title:desc":
            return desc(posts.title);
          case "priceWeb:asc":
            return asc(products.salePrice);
          case "priceWeb:desc":
            return desc(products.salePrice);
          case "random":
            return sql`random()`;
          default:
            return desc(products.createdAt);
        }
      })();

      const skip = offset ?? (page - 1) * perPage;
      const rows = await db
        .select({ product: products, post: posts })
        .from(products)
        .leftJoin(posts, eq(posts.id, products.postId))
        .where(where)
        .orderBy(orderBy)
        .limit(perPage)
        .offset(skip);

      const ids = rows.map((r) => r.product.id);
      const imgs = ids.length
        ? await db
            .select({
              id: productImages.id,
              productId: productImages.productId,
              altText: productImages.altText,
              sortOrder: productImages.sortOrder,
              url: media.url,
            })
            .from(productImages)
            .innerJoin(media, eq(media.id, productImages.mediaId))
            .where(inArray(productImages.productId, ids))
            .orderBy(asc(productImages.sortOrder))
        : [];
      const imgByProduct = new Map<string, (typeof imgs)[number]>();
      for (const im of imgs) {
        if (!imgByProduct.has(im.productId)) imgByProduct.set(im.productId, im);
      }

      return {
        data: rows.map((r) => {
          const dto = toProductDTO(r.product, r.post);
          const im = imgByProduct.get(r.product.id);
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
      const [row] = await db
        .select({ product: products, post: posts })
        .from(products)
        .leftJoin(posts, eq(posts.id, products.postId))
        .where(and(eq(products.tenantId, tid(req)), eq(products.id, req.params.id)))
        .limit(1);
      if (!row?.product) return reply.notFound();
      const imgs = await db
        .select({
          id: productImages.id,
          productId: productImages.productId,
          altText: productImages.altText,
          sortOrder: productImages.sortOrder,
          url: media.url,
        })
        .from(productImages)
        .innerJoin(media, eq(media.id, productImages.mediaId))
        .where(eq(productImages.productId, row.product.id))
        .orderBy(asc(productImages.sortOrder));
      return reply.send({ ...toProductDTO(row.product, row.post), images: imgs.map(toImageDTO) });
    },
  );

  app.get(
    "/catalog/products/by-slug/:slug",
    {
      schema: { params: z.object({ slug: z.string() }), response: { 200: productDTO } },
    },
    async (req, reply) => {
      const [row] = await db
        .select({ product: products, post: posts })
        .from(products)
        .innerJoin(posts, eq(posts.id, products.postId))
        .where(and(eq(products.tenantId, tid(req)), eq(posts.slug, req.params.slug)))
        .limit(1);
      if (!row?.product) return reply.notFound();
      const imgs = await db
        .select({
          id: productImages.id,
          productId: productImages.productId,
          altText: productImages.altText,
          sortOrder: productImages.sortOrder,
          url: media.url,
        })
        .from(productImages)
        .innerJoin(media, eq(media.id, productImages.mediaId))
        .where(eq(productImages.productId, row.product.id))
        .orderBy(asc(productImages.sortOrder));
      return reply.send({ ...toProductDTO(row.product, row.post), images: imgs.map(toImageDTO) });
    },
  );

  app.post(
    "/catalog/products",
    { schema: { body: productInput, response: { 200: productDTO } } },
    async (req, reply) => {
      const { title, slug, description, priceNormal, priceWeb, productType, ...rest } = req.body;
      const [post] = await db
        .insert(posts)
        .values({
          tenantId: tid(req),
          postType: "page",
          title,
          slug,
          content: description ?? null,
          status: "publish",
        })
        .returning();
      const [row] = await db
        .insert(products)
        .values({
          tenantId: tid(req),
          postId: post!.id,
          sku: rest.sku,
          barcode: rest.barcode ?? null,
          regularPrice: priceNormal != null ? String(priceNormal) : null,
          salePrice: priceWeb != null ? String(priceWeb) : null,
          type: productType ?? "physical",
          status: rest.status ?? "draft",
          featured: rest.featured ?? false,
        })
        .returning();
      return reply.send(toProductDTO(row!, post!));
    },
  );

  app.patch(
    "/catalog/products/:id",
    { schema: { params: idParam, body: productInput.partial(), response: { 200: productDTO } } },
    async (req, reply) => {
      const { title, slug, description, priceNormal, priceWeb, productType, ...rest } = req.body;
      const [row] = await db
        .update(products)
        .set({
          ...(rest.sku !== undefined && { sku: rest.sku }),
          ...(rest.barcode !== undefined && { barcode: rest.barcode }),
          ...(priceNormal !== undefined && { regularPrice: String(priceNormal) }),
          ...(priceWeb !== undefined && { salePrice: String(priceWeb) }),
          ...(productType !== undefined && { type: productType }),
          ...(rest.status !== undefined && { status: rest.status }),
          ...(rest.featured !== undefined && { featured: rest.featured }),
          updatedAt: new Date(),
        })
        .where(and(eq(products.tenantId, tid(req)), eq(products.id, req.params.id)))
        .returning();
      if (!row) return reply.notFound();
      if (title || slug || description !== undefined) {
        const postUpdate: Record<string, unknown> = { updatedAt: new Date() };
        if (title) postUpdate.title = title;
        if (slug) postUpdate.slug = slug;
        if (description !== undefined) postUpdate.content = description;
        if (row.postId) {
          await db.update(posts).set(postUpdate).where(eq(posts.id, row.postId));
        }
      }
      const [post] = row.postId
        ? await db.select().from(posts).where(eq(posts.id, row.postId)).limit(1)
        : [null];
      return reply.send(toProductDTO(row, post));
    },
  );

  app.delete(
    "/catalog/products/:id",
    { schema: { params: idParam } },
    async (req, reply) => {
      await db
        .delete(products)
        .where(and(eq(products.tenantId, tid(req)), eq(products.id, req.params.id)));
      return reply.send({ ok: true });
    },
  );
}

// ---------- mappers ----------
function toCategoryDTO(r: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
}) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    parentId: r.parentId ?? null,
    position: 0,
    fliaCodigo: null,
    icon: null,
    description: r.description ?? null,
    seo: null,
    active: true,
    custom: null,
  };
}
function toBrandDTO(r: { id: string; name: string; slug: string; description: string | null }) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    logoUrl: null,
    description: r.description ?? null,
    active: true,
  };
}
function toProductDTO(
  r: typeof products.$inferSelect,
  p: typeof posts.$inferSelect | null,
) {
  return {
    id: r.id,
    sku: r.sku ?? "",
    codInterno: null,
    barcode: r.barcode ?? null,
    slug: p?.slug ?? "",
    title: p?.title ?? "",
    description: p?.content ?? null,
    brandId: null,
    categoryId: null,
    priceNormal: Number(r.regularPrice ?? 0),
    priceWeb: Number(r.salePrice ?? 0),
    unit: "unidad",
    unitStep: 1,
    onPromo: false,
    promoCode: null,
    controlled: false,
    featured: r.featured,
    status: r.status as "draft" | "published" | "archived",
    productType: r.type as "physical" | "digital" | "service",
    attributes: null,
    stockCached: 0,
    custom: null,
    seo: null,
    erpSourced: !!r.erpId,
    sourceSystem: null,
    sourceId: null,
    syncedAt: r.erpSyncedAt ? r.erpSyncedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
function toImageDTO(r: { id: string; url: string | null; altText: string; sortOrder: number }) {
  return {
    id: r.id,
    url: r.url ?? "",
    alt: r.altText || null,
    position: r.sortOrder,
    isPrimary: r.sortOrder === 0,
  };
}
