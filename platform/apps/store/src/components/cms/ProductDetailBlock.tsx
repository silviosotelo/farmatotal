"use client";

import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductSpecs } from "@/components/product/ProductSpecs";
import { BranchStock } from "@/components/product/BranchStock";
import { useMoney } from "@/components/providers/CurrencyContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { useProductData } from "./ProductDataContext";

/**
 * Bloque data-bound "Ficha de producto" del builder. Consume el producto que la
 * ruta dejó en contexto (ProductDataProvider) y arma la ficha completa con los
 * componentes funcionales reales (galería, add-to-cart, tabs, relacionados).
 * Editable/posicionable desde el builder; reemplaza la ficha hardcodeada.
 */
export function ProductDetailBlock({
  showRelated = true,
  showTabs = true,
  relatedTitle = "Productos relacionados",
}: {
  showRelated?: boolean;
  showTabs?: boolean;
  relatedTitle?: string;
}) {
  const money = useMoney();
  const flags = useFlags();
  const data = useProductData();
  if (!data) return null;
  const { product, related, reviews, variants } = data;

  return (
    <section className="ft-container py-8">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <ProductGallery images={product.gallery ?? [product.image]} alt={product.title} discount={product.discount} />

        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-[26px] font-bold leading-tight text-brand-text">{product.title}</h1>
          <div className="text-sm text-brand-muted">SKU: {product.sku}</div>

          <div className="font-price mt-1 flex flex-col gap-0.5">
            <div className="text-sm text-price-muted">
              Precio Normal: <span className="line-through">{money(product.priceNormal)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-brand-muted">Precio Web:</span>
              <span className="text-[28px] font-bold leading-none text-brand-orange">{money(product.priceWeb)}</span>
            </div>
          </div>

          {flags.inventory && product.stock === 0 && (
            <p className="text-sm font-medium text-[#c0392b]">Sin stock</p>
          )}

          <BranchStock productId={product.id} />

          <div className="mt-2">
            <ProductActions product={product} variants={variants} />
          </div>
        </div>
      </div>

      <ProductSpecs product={product} className="mt-12" />

      {showTabs && (
        <div className="mt-12">
          <ProductTabs product={product} reviews={reviews.data} average={reviews.average} />
        </div>
      )}

      {showRelated && related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 font-heading text-xl font-bold text-brand-text">{relatedTitle}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
