import { NextRequest, NextResponse } from "next/server";

// Proxy delgado al motor (platform/apps/api). Sin Prisma/SQLite.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

type Page = { id: string };

// El motor no expone GET /cms/pages/:id; resolvemos por id sobre la lista.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await fetch(`${API}/cms/pages`, { next: { revalidate: 30 } });
    if (!r.ok) throw new Error(String(r.status));
    const d = (await r.json()) as { data?: Page[] };
    const page = (d.data ?? []).find((p) => p.id === id);
    if (!page) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  const auth = req.headers.get("authorization");
  const r = await fetch(`${API}/cms/pages/${id}`, {
    method: "PATCH",
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = req.headers.get("authorization");
  const r = await fetch(`${API}/cms/pages/${id}`, {
    method: "DELETE",
    headers: { ...(auth ? { Authorization: auth } : {}) },
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({ ok: r.ok }));
  return NextResponse.json(data, { status: r.status });
}
