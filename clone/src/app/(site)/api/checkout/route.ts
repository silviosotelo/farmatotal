import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shape que arma el storefront (CheckoutBlock.tsx).
const lineSchema = z.object({
  productId: z.string().optional(),
  sku: z.string(),
  title: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
});

const checkoutSchema = z.object({
  lines: z.array(lineSchema).min(1, "Carrito vacío"),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["online", "contraentrega"]),
  shippingMethod: z.enum(["delivery", "pickup"]),
  branchId: z.string().optional(),
  billing: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    doc: z.string().optional(),
    docType: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  }),
});

/**
 * Proxy del checkout del storefront hacia el backend de la plataforma.
 * El backend (POST :4000/orders/checkout) es público (whitelist, sin JWT),
 * persiste la orden y dispara el push al ERP. Acá sólo transformamos el body
 * del front al contrato del backend y devolvemos el shape que el front espera.
 */
export async function POST(req: NextRequest) {
  try {
    const data = checkoutSchema.parse(await req.json());

    // online -> online · contraentrega (efectivo/transferencia) -> cash
    const paymentMethod = data.paymentMethod === "online" ? "online" : "cash";

    // El backend exige branchId uuid|null; si la sucursal no es uuid, va null.
    const branchId =
      data.shippingMethod === "pickup" && data.branchId && UUID_RE.test(data.branchId)
        ? data.branchId
        : null;

    const docType =
      data.billing.docType === "RUC" ? "RUC" : data.billing.docType === "CI" ? "CI" : undefined;

    const payload = {
      customerName: data.billing.name,
      // El backend valida email; si el front no lo manda usamos un placeholder.
      customerEmail: data.billing.email || "sin-correo@farmatotal.com.py",
      customerPhone: data.billing.phone || undefined,
      customerDoc: data.billing.doc || undefined,
      docType,
      docNumber: docType ? data.billing.doc : undefined,
      shippingMethod: data.shippingMethod,
      branchId,
      shippingAddress:
        data.shippingMethod === "delivery"
          ? { address: data.billing.address ?? "", city: data.billing.city ?? "" }
          : undefined,
      paymentMethod,
      couponCode: data.couponCode || undefined,
      lines: data.lines.map((l) => ({
        // productId sólo si es uuid real del backend; si no, se omite.
        productId: l.productId && UUID_RE.test(l.productId) ? l.productId : undefined,
        sku: l.sku,
        title: l.title,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
    };

    const res = await fetch(`${API_URL}/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      let msg = "Error al crear el pedido";
      try {
        const e = await res.json();
        msg = e.message || e.error || msg;
      } catch {
        /* respuesta no-JSON */
      }
      return NextResponse.json({ error: msg }, { status: res.status === 400 ? 400 : 502 });
    }

    // Backend devuelve { id, number, total, status }
    const order = (await res.json()) as {
      id: string;
      number: string;
      total: number;
      status: string;
    };

    return NextResponse.json({
      id: order.id,
      number: order.number,
      total: order.total,
      status: order.status,
      paymentMethod,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Checkout proxy error:", err);
    return NextResponse.json(
      { error: "Error de conexión con el servidor" },
      { status: 502 },
    );
  }
}
