import { NextRequest, NextResponse } from "next/server";

// Proxy delgado al motor (platform/apps/api). Sin Prisma/SQLite.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

type BackendCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

export async function GET(req: NextRequest) {
  const parentId = req.nextUrl.searchParams.get("parentId");
  const qs = new URLSearchParams({ perPage: "2000" });
  if (parentId) qs.set("parentId", parentId);

  try {
    const r = await fetch(`${API}/catalog/categories?${qs.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!r.ok) throw new Error(String(r.status));
    const d = (await r.json()) as { data?: BackendCategory[] };
    // Contrato histórico: array plano. nameOverride/productCount no existen en el
    // motor; se preservan las claves para no romper consumidores legacy.
    return NextResponse.json(
      (d.data ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        nameOverride: null,
        icon: c.icon,
        productCount: 0,
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
