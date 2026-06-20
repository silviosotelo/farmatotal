import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * BFF → proxy a GET {API_BASE}/payments/bancard/status/:orderId.
 * Devuelve { status, provider } para que /pago/retorno confirme el resultado.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const res = await fetch(`${API_BASE}/payments/bancard/status/${encodeURIComponent(orderId)}`);
    const data = await res.json().catch(() => ({ status: "none" }));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ status: "none", error: "No se pudo consultar el estado" }, { status: 502 });
  }
}
