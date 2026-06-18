import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, subtotal } = schema.parse(body);

    const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: "Cupón inválido" }, { status: 404 });
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "Cupón expirado" }, { status: 410 });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Cupón agotado" }, { status: 410 });
    }
    if (coupon.minTotal && subtotal < coupon.minTotal) {
      return NextResponse.json({ error: `Compra mínima: ${coupon.minTotal}` }, { status: 400 });
    }

    let discount = 0;
    if (coupon.type === "PERCENT") {
      discount = Math.round(subtotal * (coupon.value / 100));
    } else {
      discount = coupon.value;
    }

    return NextResponse.json({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      discount,
      newTotal: subtotal - discount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
