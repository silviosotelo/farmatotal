import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const AT_COOKIE = "ft_at";

type BackendImage = { url: string; isPrimary?: boolean };
type BackendProduct = {
  id: string;
  slug: string;
  title: string;
  sku: string;
  description: string | null;
  priceNormal: number;
  priceWeb: number;
  stockCached: number;
  images?: BackendImage[];
};

function discountPct(normal: number, web: number) {
  if (normal <= 0 || web >= normal) return 0;
  return Math.round(((normal - web) / normal) * 100);
}

function adaptProduct(p: BackendProduct) {
  const primary = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    image: primary || "/products/no-img.webp",
    priceNormal: p.priceNormal,
    priceWeb: p.priceWeb,
    discount: discountPct(p.priceNormal, p.priceWeb),
    sku: p.sku,
    stock: p.stockCached,
    description: p.description ?? undefined,
    gallery: p.images?.map((i) => i.url),
  };
}

function bearer(req: NextRequest) {
  const at = req.cookies.get(AT_COOKIE)?.value;
  return req.headers.get("authorization") ?? (at ? `Bearer ${at}` : "");
}

// GET /api/wishlist → lista de deseos del usuario (productos en shape storefront).
export async function GET(req: NextRequest) {
  const auth = bearer(req);
  if (!auth) return NextResponse.json({ items: [] }, { status: 401 });
  try {
    const res = await fetch(`${API}/wishlist`, { headers: { authorization: auth } });
    if (!res.ok) return NextResponse.json({ items: [] }, { status: res.status });
    const data = (await res.json()) as { data: BackendProduct[] };
    return NextResponse.json({ items: (data.data ?? []).map(adaptProduct) });
  } catch {
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}

// POST /api/wishlist { productId } → agrega un producto.
export async function POST(req: NextRequest) {
  const auth = bearer(req);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const productId = (body as { productId?: string })?.productId;
  if (!productId) return NextResponse.json({ error: "productId requerido" }, { status: 400 });
  try {
    const res = await fetch(`${API}/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: auth },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Error de conexión" }, { status: 502 });
  }
}
