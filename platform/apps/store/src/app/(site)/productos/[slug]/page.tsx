import { notFound } from "next/navigation";
import { getPage, getProductBySlug, getDeals, listReviews, listVariants } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import { ProductDataProvider } from "@/components/cms/ProductDataContext";

type Args = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Args) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const [page, related, reviews, variants] = await Promise.all([
    getPage("producto").catch(() => null),
    getDeals(10).then((d) => d.filter((p) => p.id !== product.id).slice(0, 4)),
    listReviews(product.id),
    listVariants(product.id),
  ]);

  if (page?.blocks && Array.isArray(page.blocks) && page.blocks.length > 0) {
    return (
      <ProductDataProvider value={{ product, related, reviews, variants }}>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </ProductDataProvider>
    );
  }

  return (
    <div className="ft-container py-10">
      <h1 className="text-2xl font-bold">{product.title}</h1>
      <p className="text-3xl font-bold mt-4" style={{ color: "var(--primary)" }}>
        ${product.priceWeb?.toFixed(2)}
      </p>
    </div>
  );
}
