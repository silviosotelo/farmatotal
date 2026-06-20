import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Valida un cupón contra el backend de la plataforma (GET /coupons/validate/:code).
 * Devuelve el descuento calculado para el subtotal dado. Sin DB local.
 */
export async function POST(req: NextRequest) {
  const { code, subtotal = 0 } = await req.json().catch(() => ({}));
  const normalized = String(code || "").toUpperCase().trim();
  if (!normalized) return NextResponse.json({ error: "Ingresá un código" }, { status: 400 });

  let c: { valid?: boolean; type?: string; value?: number; minSubtotal?: number };
  try {
    const r = await fetch(`${API}/coupons/validate/${encodeURIComponent(normalized)}`);
    c = await r.json();
  } catch {
    return NextResponse.json({ error: "No se pudo validar el cupón" }, { status: 502 });
  }
  if (!c?.valid) return NextResponse.json({ error: "Cupón inválido o agotado" }, { status: 404 });
  if (c.minSubtotal && subtotal < c.minSubtotal) {
    return NextResponse.json({ error: `Compra mínima: ₲ ${Number(c.minSubtotal).toLocaleString("es-PY")}` }, { status: 400 });
  }

  const isPercent = String(c.type || "").toLowerCase().includes("percent");
  const percent = isPercent ? Number(c.value) || 0 : 0;
  const amount = isPercent ? 0 : Number(c.value) || 0;
  const discount = percent > 0 ? Math.round((subtotal * percent) / 100) : amount;

  return NextResponse.json({
    code: normalized,
    type: c.type,
    value: c.value,
    percent,
    amount,
    discount,
    newTotal: Math.max(0, subtotal - discount),
  });
}
