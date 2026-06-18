/**
 * Server-side data fetchers — direct DB access for Server Components.
 * Replaces mock catalog.ts + data.ts.
 */
import { db } from "./db";
import { displayTitle, displayDescription, displaySlug, effectivePrice } from "./product";
import type { Product } from "@/types";

/** Convert a raw DB product to the Product type expected by storefront components */
function toProduct(p: {
  id: string; sku: string; slug: string; title: string; titleOverride?: string | null;
  brand: string | null; priceNormal: number; priceWeb: number; onPromo: boolean;
  controlled: boolean; stock: number;
  images: { url: string; alt?: string | null }[];
  category: { slug: string; name: string } | null;
}, overrides?: Partial<Product>): Product {
  const effectiveSlug = p.slug; // already resolved by caller if override exists
  return {
    id: p.id,
    slug: effectiveSlug,
    title: p.titleOverride ?? p.title,
    image: p.images[0]?.url ?? "/products/no-img.webp",
    priceNormal: p.priceNormal,
    priceWeb: p.priceWeb,
    discount: p.priceNormal > 0 ? Math.round(((p.priceNormal - p.priceWeb) / p.priceNormal) * 100) : 0,
    category: p.category?.slug,
    sku: p.sku,
    stock: p.stock,
    brand: p.brand ?? undefined,
    gallery: p.images.map((i) => i.url),
    ...overrides,
  };
}

/** Products list with filters (for catalog page) */
export async function getProducts(opts: {
  category?: string;
  featured?: boolean;
  onPromo?: boolean;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  page?: number;
} = {}) {
  const { category, featured, onPromo, search, sort, minPrice, maxPrice, limit = 24, page = 1 } = opts;
  const where: Record<string, unknown> = { published: true };
  if (category) where.category = { slug: category };
  if (featured) where.featured = true;
  if (onPromo) where.onPromo = true;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { brand: { contains: search } },
    ];
  }

  const orderBy: Record<string, string>[] = [];
  if (sort === "name") orderBy.push({ title: "asc" });
  else if (sort === "newest") orderBy.push({ createdAt: "desc" });
  else { orderBy.push({ featured: "desc" }); orderBy.push({ createdAt: "desc" }); }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { images: true, category: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit + (sort?.startsWith("price") || minPrice || maxPrice ? 1000 : 0),
    }),
    db.product.count({ where }),
  ]);

  let filtered = items;
  if (minPrice !== undefined) filtered = filtered.filter((p) => effectivePrice(p) >= minPrice);
  if (maxPrice !== undefined) filtered = filtered.filter((p) => effectivePrice(p) <= maxPrice);
  if (sort === "price-asc") filtered.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  if (sort === "price-desc") filtered.sort((a, b) => effectivePrice(b) - effectivePrice(a));

  const hasInMemory = sort?.startsWith("price") || minPrice || maxPrice;
  if (hasInMemory) filtered = filtered.slice(0, limit);

  return {
    items: filtered.map((p) => toProduct(p)),
    total: hasInMemory ? filtered.length : total,
    page,
    totalPages: Math.ceil((hasInMemory ? filtered.length : total) / limit),
  };
}

/** Single product by slug — returns Product type for storefront */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const p = await db.product.findFirst({
    where: {
      OR: [{ slug }, { slugOverride: slug }],
      published: true,
    },
    include: {
      images: { orderBy: { position: "asc" } },
      category: true,
    },
  });
  if (!p) return null;
  return toProduct(p, {
    slug: p.slugOverride ?? p.slug,
    description: p.descriptionOverride ?? p.description ?? undefined,
  });
}

/** Related products (same category) */
export async function getRelatedProducts(categorySlug: string, excludeId: string, limit = 8): Promise<Product[]> {
  const products = await db.product.findMany({
    where: {
      published: true,
      id: { not: excludeId },
      category: { slug: categorySlug },
    },
    include: { images: true, category: true },
    take: limit,
  });
  return products.map((p) => toProduct(p));
}

/** All categories — returns shape matching @/types Category */
export async function getCategories() {
  const cats = await db.category.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { products: { where: { published: true } } } } },
  });
  return cats.map((c) => ({
    slug: c.slug,
    name: c.nameOverride ?? c.name,
    icon: c.icon ?? undefined,
    href: `/categorias/${c.slug}/`,
    productCount: c._count.products,
  }));
}

/** Site settings by key */
export async function getSetting(key: string) {
  const s = await db.siteSetting.findUnique({ where: { key } });
  return s ? JSON.parse(s.value) : null;
}

/** Search products — returns Product[] for the buscar page */
export async function searchProducts(q: string, limit = 50): Promise<Product[]> {
  if (!q || q.length < 2) return [];
  const products = await db.product.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q } },
        { brand: { contains: q } },
        { sku: { contains: q } },
      ],
    },
    include: { images: true, category: true },
    take: limit,
    orderBy: { title: "asc" },
  });
  return products.map((p) => toProduct(p));
}

/** Get category display name by slug */
export async function getCategoryName(slug: string): Promise<string> {
  const cat = await db.category.findUnique({ where: { slug } });
  return cat?.nameOverride ?? cat?.name ?? slug;
}

/** Get all products flat (for catalog, no pagination) */
export async function getAllProducts(): Promise<Product[]> {
  const products = await db.product.findMany({
    where: { published: true },
    include: { images: true, category: true },
    orderBy: { title: "asc" },
  });
  return products.map((p) => toProduct(p));
}
