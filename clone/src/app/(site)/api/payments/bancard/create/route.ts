import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createBancardCheckout } from "@/lib/bancard";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const { orderId } = schema.parse(body);

    // Buscar la orden
    const order = await db.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: { lines: true },
    });
    if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "La orden ya fue procesada" }, { status: 400 });
    }

    // Crear registro de pago
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        provider: "bancard",
        amount: order.total,
        status: "REDIRECTED",
      },
    });

    // Llamar a Bancard
    const { processId, token } = await createBancardCheckout({
      orderId: order.id,
      amount: order.total,
      description: `Pedido ${order.number} - Farmatotal`,
    });

    // Actualizar pago con datos de Bancard
    await db.payment.update({
      where: { id: payment.id },
      data: {
        processId: processId.toString(),
        rawPayload: JSON.stringify({ processId, token }),
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      processId,
      token,
      checkoutUrl: `https://vpos.infonet.com.py/vpos/embedded/${token}`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Bancard create error:", err);
    return NextResponse.json({ error: "Error al iniciar pago" }, { status: 500 });
  }
}
