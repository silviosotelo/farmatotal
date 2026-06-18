import type { MetadataRoute } from "next";
import { listProducts, listCategories } from "@/lib/api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.farmatotal.com.py";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = await listCategories().catch(() => [] as { slug: string }[]);

  // Productos: paginar (el API tope perPage ~100). Cap razonable para el sitemap.
  const allProducts: { slug: string }[] = [];
  for (let page = 1; page <= 30; page++) {
    const { products } = await listProducts({ page, perPage: 100 }).catch(() => ({ products: [] }));
    if (!products.length) break;
    allProducts.push(...products);
  }
  const prodRes = { products: allProducts };

  const staticPaths = ["", "/catalogo", "/ofertas", "/sucursales", "/contacto"];
  const staticUrls: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${SITE}${p}/`,
    changeFrequency: "daily",
    priority: p === "" ? 1 : 0.7,
  }));

  const catUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE}/categorias/${c.slug}/`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const prodUrls: MetadataRoute.Sitemap = prodRes.products.map((p) => ({
    url: `${SITE}/productos/${p.slug}/`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticUrls, ...catUrls, ...prodUrls];
}
