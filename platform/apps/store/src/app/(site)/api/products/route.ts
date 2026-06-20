import { NextRequest, NextResponse } from "next/server";

// Proxy al motor (platform/apps/api). Sin Prisma/SQLite — fuente única = el motor.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

type BackendProduct = {
  id: string; sku: string; codInterno: string | null; slug: string; title: string;
  priceNormal: number; priceWeb: number; onPromo: boolean; controlled: boolean;
  featured: boolean; stockCached: number;
  images?: { url: string; isPrimary?: boolean }[];
};
type Paginated = { data: BackendProduct[]; page: number; perPage: number; total: number; totalPages: number };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(60, Math.max(1, Number(sp.get("limit") ?? 24)));
  const qs = new URLSearchParams({ page: String(page), perPage: String(limit), status: "published" });
  if (sp.get("q")) qs.set("q", sp.get("q")!);
  if (sp.get("featured") === "true") qs.set("featured", "true");
  if (sp.get("onPromo") === "true") qs.set("onPromo", "true");

  let res: Paginated;
  try {
    const r = await fetch(`${API}/catalog/products?${qs.toString()}`, { next: { revalidate: 30 } });
    if (!r.ok) throw new Error(String(r.status));
    res = (await r.json()) as Paginated;
  } catch {
    return NextResponse.json({ items: [], page, limit, total: 0, totalPages: 0 });
  }

  const items = res.data.map((p) => ({
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    title: p.title,
    brand: null,
    priceNormal: p.priceNormal,
    priceWeb: p.priceWeb,
    onPromo: p.onPromo,
    controlled: p.controlled,
    featured: p.featured,
    stock: p.stockCached,
    image: p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? "/products/no-img.webp",
    category: null,
  }));

  return NextResponse.json({ items, page, limit, total: res.total, totalPages: res.totalPages });
}
