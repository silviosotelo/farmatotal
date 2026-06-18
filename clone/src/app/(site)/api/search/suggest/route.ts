import { NextRequest, NextResponse } from "next/server";

// Proxy al motor para el autocomplete del header. Sin Prisma.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);
  try {
    const r = await fetch(`${API}/catalog/products?q=${encodeURIComponent(q)}&perPage=8&status=published`, {
      next: { revalidate: 15 },
    });
    if (!r.ok) return NextResponse.json([]);
    const res = (await r.json()) as {
      data: {
        id: string;
        slug: string;
        title: string;
        priceWeb: number;
        priceNormal: number;
        images?: { url: string; isPrimary?: boolean }[];
      }[];
    };
    return NextResponse.json(
      res.data.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        price: p.priceWeb,
        priceNormal: p.priceNormal,
        image: p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? "/products/no-img.webp",
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
