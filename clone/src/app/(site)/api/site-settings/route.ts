import { NextRequest, NextResponse } from "next/server";

// Proxy delgado al motor (platform/apps/api). Sin Prisma/SQLite.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  // El motor no expone enumeración de settings; sin ?key devolvemos mapa vacío
  // (el contrato histórico devolvía un objeto clave→valor).
  if (!key) return NextResponse.json({});

  try {
    const r = await fetch(`${API}/cms/settings/${encodeURIComponent(key)}`, {
      next: { revalidate: 30 },
    });
    if (!r.ok) return NextResponse.json(null);
    const d = (await r.json()) as { key: string; value: unknown };
    // Contrato histórico: devuelve sólo el valor (ya parseado por el motor).
    return NextResponse.json(d?.value ?? null);
  } catch {
    return NextResponse.json(null);
  }
}
