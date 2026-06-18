import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Lista de pedidos del storefront → proxy a GET :4000/orders del backend.
 * GET /orders en el backend NO está en el whitelist público: si requiere JWT,
 * reenviamos Authorization/cookie del request entrante. Si el storefront no
 * tiene sesión, el backend responde 401/403 y devolvemos 401.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 10));

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers.authorization = auth;
  const cookie = req.headers.get("cookie");
  if (cookie) headers.cookie = cookie;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/orders?page=${page}&perPage=${limit}`, {
      headers,
      cache: "no-store",
    });
  } catch (err) {
    console.error("Orders proxy error:", err);
    return NextResponse.json(
      { error: "Error de conexión con el servidor" },
      { status: 502 },
    );
  }

  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "No se pudieron obtener los pedidos" },
      { status: 502 },
    );
  }

  // Backend: { data, page, perPage, total, totalPages }
  const body = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };

  const items = (body.data ?? []).map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    total: o.total,
    subtotal: o.subtotal,
    discount: o.discount,
    paymentMethod: o.paymentMethod,
    shippingMethod: o.shippingMethod,
    // El listado del backend no incluye líneas; el detalle vive en /orders/:id.
    lines: [],
    createdAt: o.createdAt,
  }));

  return NextResponse.json({
    items,
    page: body.page ?? page,
    totalPages: body.totalPages ?? 1,
    total: body.total ?? items.length,
  });
}
