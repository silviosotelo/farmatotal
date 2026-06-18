import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const schema = z.object({
  orderId: z.string().min(1),
});

/**
 * BFF → proxy a POST {API_BASE}/payments/bancard/create.
 * El backend crea el pago vPOS contra la orden y devuelve { processId, jsUrl, shopProcessId }.
 * Estos valores alimentan el SDK iframe de Bancard (Bancard.Checkout.createForm) en /pago/[id].
 * Es escritura pública (checkout de invitado) — no exige sesión.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/payments/bancard/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: parsed.data.orderId }),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con el servidor" }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 503 = pasarela no configurada (sin claves). El front lo maneja como "no disponible".
    return NextResponse.json(
      {
        error:
          (data as { message?: string; error?: string })?.message ??
          (data as { error?: string })?.error ??
          "Error al iniciar pago",
      },
      { status: res.status },
    );
  }

  const { processId, jsUrl, shopProcessId } = data as {
    processId?: string;
    jsUrl?: string;
    shopProcessId?: number;
  };
  if (!processId || !jsUrl) {
    return NextResponse.json({ error: "Respuesta de pago inválida" }, { status: 502 });
  }

  return NextResponse.json({ processId, jsUrl, shopProcessId });
}
