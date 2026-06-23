"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { useMoney } from "@/components/providers/CurrencyContext";
import { StockBadge } from "@/themes/CatalogStock";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { Tag } from "@platform/ui";

/**
 * Tarjeta de producto con el markup/clases de Ekomart (single-shopping-card-one),
 * cableada a nuestro tipo Product. Componente cliente: se renderiza dentro de
 * carruseles/tabs cliente y usa la moneda del tenant vía useMoney.
 */
export function EkomartProductCard({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const money = useMoney();
  const flags = useFlags();
  const href = `/productos/${product.slug}/`;
  const hasDiscount = product.priceNormal > product.priceWeb && product.discount > 0;
  const inStock = (product.stock ?? 0) > 0;

  return (
    <div className={`single-shopping-card-one${className ? ` ${className}` : ""}`}>
      <div className="image-and-action-area-wrapper">
        <Link href={href} className="thumbnail-preview">
          {hasDiscount && (
            <Tag className="badge">
              <span>
                {product.discount}% <br />
                Off
              </span>
              <i className="fa-solid fa-bookmark" />
            </Tag>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.title} />
        </Link>
        <div className="action-share-option">
          <Link href={href} className="single-action openuptip" title="Ver producto">
            <i className="fa-regular fa-eye" />
          </Link>
        </div>
      </div>

      <div className="body-content">
        <Link href={href}>
          <h4 className="title">{product.title}</h4>
        </Link>
        {flags.inventory && (
          <span className="availability">{inStock ? "En stock" : "Sin stock"}</span>
        )}
        <div className="mt-1">
          <StockBadge sku={product.sku ?? ""} />
        </div>
        <div className="price-area">
          <span className="current">{money(product.priceWeb)}</span>
          {hasDiscount && <div className="previous">{money(product.priceNormal)}</div>}
        </div>

        <div className="cart-counter-action">
          <Link href={href} className="rts-btn btn-primary radious-sm with-icon add-to-card">
            <div className="btn-text">Agregar</div>
            <div className="arrow-icon">
              <i className="fa-regular fa-cart-shopping" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
