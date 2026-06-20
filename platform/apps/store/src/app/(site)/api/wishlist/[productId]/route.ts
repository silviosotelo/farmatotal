import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const AT_COOKIE = "ft_at";

// DELETE /api/wishlist/:productId → quita un producto de la lista de deseos.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const at = req.cookies.get(AT_COOKIE)?.value;
  const auth = req.headers.get("authorization") ?? (at ? `Bearer ${at}` : "");
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    const res = await fetch(`${API}/wishlist/${encodeURIComponent(productId)}`, {
      method: "DELETE",
      headers: { authorization: auth },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Error de conexión" }, { status: 502 });
  }
}
