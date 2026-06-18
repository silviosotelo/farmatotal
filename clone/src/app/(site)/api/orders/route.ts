import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 10));

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    items: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      total: o.total,
      subtotal: o.subtotal,
      discount: o.discount,
      paymentMethod: o.paymentMethod,
      shippingMethod: o.shippingMethod,
      lines: o.lines.map((l) => ({
        sku: l.sku,
        title: l.title,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        subtotal: l.subtotal,
      })),
      createdAt: o.createdAt,
    })),
    page,
    totalPages: Math.ceil(total / limit),
    total,
  });
}
