import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductTabs } from "@/components/product/ProductTabs";
import { BranchStock } from "@/components/product/BranchStock";
import { formatGs } from "@/lib/format";
import { getProductBySlug, getDeals, listReviews, listVariants } from "@/lib/api";
import { getActiveTheme } from "@/themes/registry";
import { EkomartProductDetail } from "@/themes/ekomart/pages/EkomartProductDetail";
import { AnvogueProductDetail } from "@/themes/anvogue/pages/AnvogueProductDetail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Producto no encontrado - Farmatotal" };
  return { title: `${p.title} - Farmatotal` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, reviews, variants] = await Promise.all([
    getDeals(10).then((d) => d.filter((p) => p.id !== product.id).slice(0, 4)),
    listReviews(product.id),
    listVariants(product.id),
  ]);

  // Ficha tematizada por tema activo (farmatotal = base inline más abajo).
  const theme = await getActiveTheme();
  if (theme === "ekomart") {
    return <EkomartProductDetail product={product} related={related} reviews={reviews} variants={variants} />;
  }
  if (theme === "anvogue") {
    return <AnvogueProductDetail product={product} related={related} reviews={reviews} variants={variants} />;
  }

  return (
    <main className="flex-1 pb-12">
      <Breadcrumbs
        items={[
          { label: "Ofertas", href: `/categorias/ofertas/` },
          { label: product.title },
        ]}
      />

      <section className="ft-container py-8">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          {/* LEFT — gallery */}
          <ProductGallery images={product.gallery ?? [product.image]} alt={product.title} discount={product.discount} />

          {/* RIGHT — summary */}
          <div className="flex flex-col gap-3">
            <h1 className="font-heading text-[26px] font-bold leading-tight text-brand-text">{product.title}</h1>

            <div className="text-sm text-brand-muted">SKU: {product.sku}</div>

            <div className="font-price mt-1 flex flex-col gap-0.5">
              <div className="text-sm text-price-muted">
                Precio Normal: <span className="line-through">{formatGs(product.priceNormal)}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-brand-muted">Precio Web:</span>
                <span className="text-[28px] font-bold leading-none text-brand-orange">{formatGs(product.priceWeb)}</span>
              </div>
            </div>

            {product.stock === 0 && <p className="text-sm font-medium text-[#c0392b]">Sin stock</p>}

            <BranchStock productId={product.id} />

            <div className="mt-2">
              <ProductActions product={product} variants={variants} />
            </div>
          </div>
        </div>

        {/* Pestañas: descripción / info / valoraciones */}
        <div className="mt-12">
          <ProductTabs product={product} reviews={reviews.data} average={reviews.average} />
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 font-heading text-xl font-bold text-brand-text">Productos relacionados</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {related.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
