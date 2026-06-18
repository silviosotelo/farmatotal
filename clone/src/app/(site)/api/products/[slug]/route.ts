import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const product = await db.product.findFirst({
    where: {
      OR: [{ slug }, { slugOverride: slug }],
      published: true,
    },
    include: {
      images: { orderBy: { position: "asc" } },
      category: true,
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 10 },
      inventory: { include: { branch: true } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    title: product.title,
    titleOverride: product.titleOverride,
    description: product.description,
    descriptionOverride: product.descriptionOverride,
    brand: product.brand,
    priceNormal: product.priceNormal,
    priceWeb: product.priceWeb,
    onPromo: product.onPromo,
    controlled: product.controlled,
    featured: product.featured,
    stock: product.stock,
    images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
    category: product.category
      ? { slug: product.category.slug, name: product.category.name }
      : null,
    reviews: product.reviews.map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
    })),
    inventory: product.inventory.map((inv) => ({
      branchId: inv.branchId,
      branchName: inv.branch.name,
      quantity: inv.quantity,
    })),
  });
}
