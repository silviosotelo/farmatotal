import { NextRequest, NextResponse } from "next/server";

// Proxy delgado al motor (platform/apps/api). Sin Prisma/SQLite.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

export async function GET() {
  try {
    const r = await fetch(`${API}/cms/pages`, { next: { revalidate: 30 } });
    if (!r.ok) throw new Error(String(r.status));
    const d = (await r.json()) as { data?: unknown[] };
    // Contrato histórico: array plano de páginas.
    return NextResponse.json(d.data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get("authorization");
  const r = await fetch(`${API}/cms/pages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
