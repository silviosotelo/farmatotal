import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const lineSchema = z.object({
  productId: z.string(),
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
    doc: z.string().optional(),
    docType: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  }),
});

function generateOrderNumber(): string {
  return `FT-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const data = checkoutSchema.parse(body);

    // Validate stock
    for (const line of data.lines) {
      const product = await db.product.findUnique({ where: { id: line.productId } });
      if (!product) {
        return NextResponse.json({ error: `Producto no encontrado: ${line.sku}` }, { status: 400 });
      }
      if (product.stock < line.quantity) {
        return NextResponse.json({
          error: `Stock insuficiente para ${product.title}. Disponible: ${product.stock}`,
        }, { status: 400 });
      }
    }

    // Calculate totals
    const subtotal = data.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    let discount = 0;

    // Apply coupon
    if (data.couponCode) {
      const coupon = await db.coupon.findUnique({ where: { code: data.couponCode.toUpperCase() } });
      if (coupon && coupon.active) {
        if (coupon.type === "PERCENT") {
          discount = Math.round(subtotal * (coupon.value / 100));
        } else {
          discount = coupon.value;
        }
        await db.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const total = Math.max(0, subtotal - discount);

    // Create order
    const order = await db.order.create({
      data: {
        number: generateOrderNumber(),
        userId: user?.id ?? null,
        status: data.paymentMethod === "contraentrega" ? "PENDING" : "PENDING",
        subtotal,
        discount,
        total,
        couponCode: data.couponCode?.toUpperCase(),
        paymentMethod: data.paymentMethod,
        shippingMethod: data.shippingMethod,
        branchId: data.shippingMethod === "pickup" ? data.branchId : null,
        billingName: data.billing.name,
        billingDoc: data.billing.doc,
        billingDocType: data.billing.docType,
        billingPhone: data.billing.phone,
        billingAddress: data.billing.address,
        billingCity: data.billing.city,
        lines: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            sku: l.sku,
            title: l.title,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            subtotal: l.unitPrice * l.quantity,
          })),
        },
      },
      include: { lines: true },
    });

    // Decrement stock
    for (const line of data.lines) {
      await db.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      });
    }

    return NextResponse.json({
      id: order.id,
      number: order.number,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Inicia sesión para continuar" }, { status: 401 });
    }
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
