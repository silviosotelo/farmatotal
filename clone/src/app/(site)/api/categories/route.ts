import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: { select: { products: { where: { published: true } } } },
    },
  });

  return NextResponse.json(
    categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameOverride: c.nameOverride,
      icon: c.icon,
      productCount: c._count.products,
    }))
  );
}
