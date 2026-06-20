import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * BFF → proxy a POST {API_BASE}/payments/bancard/confirm.
 * Reenvía tal cual el body del callback server-to-server de Bancard
 * (shape `{ operation: { shop_process_id, token, ... } }`). El backend
 * verifica el token y actualiza pago + orden. Devolvemos su respuesta.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const res = await fetch(`${API_BASE}/payments/bancard/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Bancard confirm proxy error:", err);
    return NextResponse.json({ error: "Error al confirmar pago" }, { status: 500 });
  }
}
