import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmBancardPayment } from "@/lib/bancard";
import { z } from "zod";

const schema = z.object({
  processId: z.number(),
  orderId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { processId, orderId } = schema.parse(body);

    // Verificar con Bancard
    const confirmation = await confirmBancardPayment(processId);

    const payment = await db.payment.findFirst({
      where: { orderId, processId: processId.toString() },
    });
    if (!payment) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    const isPaid = confirmation.response_code === "00";

    // Actualizar pago
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: isPaid ? "PAID" : "FAILED",
        transactionId: confirmation.ticket_number,
        rawPayload: JSON.stringify(confirmation),
      },
    });

    // Actualizar orden
    await db.order.update({
      where: { id: orderId },
      data: {
        status: isPaid ? "PAID" : "PENDING",
      },
    });

    return NextResponse.json({
      paid: isPaid,
      responseCode: confirmation.response_code,
      description: confirmation.response_description,
      authorizationNumber: confirmation.authorization_number,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Bancard confirm error:", err);
    return NextResponse.json({ error: "Error al confirmar pago" }, { status: 500 });
  }
}
