import { NextResponse } from "next/server";

// Proxy delgado al motor (platform/apps/api). Sin Prisma/SQLite.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

type Branch = { active?: boolean; name?: string };

export async function GET() {
  try {
    const r = await fetch(`${API}/branches?perPage=500`, { next: { revalidate: 60 } });
    if (!r.ok) throw new Error(String(r.status));
    const d = (await r.json()) as { data?: Branch[] };
    // Contrato histórico: array plano de sucursales activas, ordenadas por nombre.
    const rows = (d.data ?? [])
      .filter((b) => b.active !== false)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}
