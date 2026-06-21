import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductSpecs } from "@/components/product/ProductSpecs";
import { BranchStock } from "@/components/product/BranchStock";
import { formatMoney } from "@/lib/money";
import { getProductBySlug, getDeals, listReviews, listVariants, getPage, getStoreConfig } from "@/lib/api";
import { getActiveTheme } from "@/themes/registry";
import { EkomartProductDetail } from "@/themes/ekomart/pages/EkomartProductDetail";
import { AnvogueProductDetail } from "@/themes/anvogue/pages/AnvogueProductDetail";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import { ProductDataProvider } from "@/components/cms/ProductDataContext";

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

  // Farmatotal: la ficha es un documento del builder (slug `producto`). La ruta
  // provee el producto por contexto y el bloque ProductDetail lo consume.
  const doc = await getPage("producto").catch(() => null);
  if (doc?.published && Array.isArray(doc.blocks) && doc.blocks.length > 0) {
    return (
      <ProductDataProvider value={{ product, related, reviews, variants }}>
        <main className="flex-1 pb-12">
          <Breadcrumbs items={[{ label: "Ofertas", href: `/categorias/ofertas/` }, { label: product.title }]} />
          <ChaiRender blocks={doc.blocks as ChaiBlock[]} />
        </main>
      </ProductDataProvider>
    );
  }

  const { currency, locale } = await getStoreConfig();
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
                Precio Normal: <span className="line-through">{formatMoney(product.priceNormal, { currency, locale })}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-brand-muted">Precio Web:</span>
                <span className="text-[28px] font-bold leading-none text-brand-orange">{formatMoney(product.priceWeb, { currency, locale })}</span>
              </div>
            </div>

            {product.stock === 0 && <p className="text-sm font-medium text-[#c0392b]">Sin stock</p>}

            <BranchStock productId={product.id} />

            <div className="mt-2">
              <ProductActions product={product} variants={variants} />
            </div>
          </div>
        </div>

        <ProductSpecs product={product} className="mt-12" />

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
