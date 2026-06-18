import { NextRequest, NextResponse } from "next/server";

// Proxy delgado al motor (platform/apps/api). Sin Prisma/SQLite.
// Compone producto (by-slug) + reviews + inventario por sucursal.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

type BackendImage = { url: string; alt?: string | null };
type BackendProduct = {
  id: string;
  sku: string;
  slug: string;
  title: string;
  description: string | null;
  priceNormal: number;
  priceWeb: number;
  onPromo: boolean;
  controlled: boolean;
  featured: boolean;
  stockCached: number;
  images?: BackendImage[];
};
type BackendReview = { id: string; author: string; rating: number; body: string; createdAt: string };
type BackendInv = { branchId: string; branchName: string; stock: number };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const pr = await fetch(`${API}/catalog/products/by-slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: 30 },
  });
  if (pr.status === 404) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
  if (!pr.ok) {
    return NextResponse.json({ error: "Error interno" }, { status: 502 });
  }
  const product = (await pr.json()) as BackendProduct;

  // Reviews aprobadas + inventario por sucursal (best-effort, no rompen el detalle).
  const [reviews, inventory] = await Promise.all([
    fetch(`${API}/reviews?productId=${product.id}&perPage=10`, { next: { revalidate: 30 } })
      .then((r) => (r.ok ? (r.json() as Promise<{ data?: BackendReview[] }>) : { data: [] }))
      .then((d) => d.data ?? [])
      .catch(() => [] as BackendReview[]),
    fetch(`${API}/inventory/product/${product.id}`, { next: { revalidate: 30 } })
      .then((r) => (r.ok ? (r.json() as Promise<{ data?: BackendInv[] }>) : { data: [] }))
      .then((d) => d.data ?? [])
      .catch(() => [] as BackendInv[]),
  ]);

  return NextResponse.json({
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    title: product.title,
    titleOverride: null,
    description: product.description,
    descriptionOverride: null,
    brand: null,
    priceNormal: product.priceNormal,
    priceWeb: product.priceWeb,
    onPromo: product.onPromo,
    controlled: product.controlled,
    featured: product.featured,
    stock: product.stockCached,
    images: (product.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? null })),
    category: null,
    reviews: reviews.map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
    })),
    inventory: inventory.map((inv) => ({
      branchId: inv.branchId,
      branchName: inv.branchName,
      quantity: inv.stock,
    })),
  });
}
