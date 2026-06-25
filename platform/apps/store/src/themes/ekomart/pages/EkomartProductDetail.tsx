import Link from "next/link";
import type { ThemeProductDetailProps } from "@/themes/types";
import { formatMoney } from "@/lib/money";
import { getStoreConfig } from "@/lib/api";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductSpecs } from "@/components/product/ProductSpecs";
import { BranchStock } from "@/components/product/BranchStock";
import { InventoryGate } from "@/components/providers/InventoryGate";
import { EkomartProductCard } from "../EkomartProductCard";

/**
 * Ficha de producto en el estilo visual de Ekomart (Bootstrap + clases rts-*).
 * Server component: la interactividad (carrito, qty, variantes, tabs, stock por
 * sucursal) la aportan los componentes cliente compartidos que se envuelven aquí.
 */
export async function EkomartProductDetail({ product, related, reviews, variants }: ThemeProductDetailProps) {
  const { currency, locale } = await getStoreConfig();
  const hasDiscount = product.priceNormal > product.priceWeb && product.discount > 0;
  const inStock = (product.stock ?? 0) > 0;
  const categoryHref = product.category ? `/productos/?categoria=${product.category}` : "/productos/";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">Inicio</Link>
                <i className="fa-regular fa-chevron-right" />
                <Link href="/productos/">Productos</Link>
                {product.category && (
                  <>
                    <i className="fa-regular fa-chevron-right" />
                    <Link href={categoryHref}>{product.category}</Link>
                  </>
                )}
                <i className="fa-regular fa-chevron-right" />
                <span className="current">{product.title}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="section-seperator bg_light-1">
        <div className="container">
          <hr className="section-seperator" />
        </div>
      </div>

      {/* Detalle */}
      <div className="rts-chop-details-area rts-section-gap bg_light-1">
        <div className="container">
          <div className="shopdetails-style-1-wrapper">
            <div className="row g-5">
              {/* Galería */}
              <div className="col-xl-6 col-lg-6 col-md-12">
                <ProductGallery
                  images={product.gallery ?? [product.image]}
                  alt={product.title}
                  discount={product.discount}
                />
              </div>

              {/* Resumen */}
              <div className="col-xl-6 col-lg-6 col-md-12">
                <div className="contents">
                  <div className="product-status">
                    {product.category && (
                      <Link href={categoryHref} className="product-catagory">
                        {product.category}
                      </Link>
                    )}
                  </div>

                  <h1 className="product-title">{product.title}</h1>

                  <span
                    className="product-price mb--15 d-block"
                    style={{ color: "var(--brand-orange)", fontWeight: 600 }}
                  >
                    {formatMoney(product.priceWeb, { currency, locale })}
                    {hasDiscount && (
                      <span className="old-price ml--15">{formatMoney(product.priceNormal, { currency, locale })}</span>
                    )}
                  </span>

                  <div className="product-uniques mb--20">
                    <span className="sku product-unipue mb--10">
                      <span style={{ fontWeight: 400, marginRight: 10 }}>SKU:</span>
                      {product.sku ?? "—"}
                    </span>
                    <InventoryGate>
                      <span className="tags product-unipue mb--10">
                        <span style={{ fontWeight: 400, marginRight: 10 }}>Disponibilidad:</span>
                        {inStock ? "En stock" : "Sin stock"}
                      </span>
                    </InventoryGate>
                  </div>

                  {product.description && <p className="mb--20">{product.description}</p>}

                  {/* Carrito + cantidad + variantes (cliente) */}
                  <ProductActions product={product} variants={variants} />

                  {/* Stock por sucursal (cliente) */}
                  <BranchStock productId={product.id} />
                </div>
              </div>
            </div>

            {/* Ficha técnica */}
            <ProductSpecs product={product} className="mt--50" />

            {/* Descripción / Información / Valoraciones */}
            <div className="product-discription-tab-shop mt--50">
              <ProductTabs product={product} reviews={reviews.data} average={reviews.average} />
            </div>
          </div>
        </div>
      </div>

      {/* Productos relacionados */}
      {related.length > 0 && (
        <div className="rts-grocery-feature-area rts-section-gap">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="title-area-between">
                  <h2 className="title-left">Productos relacionados</h2>
                </div>
              </div>
            </div>
            <div className="row g-4">
              {related.map((item) => (
                <div key={item.id} className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                  <EkomartProductCard product={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
