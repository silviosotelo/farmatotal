import Link from "next/link";
import { Eye } from "lucide-react";
import type { Product } from "@/types";
import { formatGs } from "@/lib/format";
import { StockBadge } from "@/themes/CatalogStock";

/**
 * Tarjeta de producto del tema Anvogue (fashion): imagen cuadrada sobre surface,
 * badge de descuento (rojo), título sobrio y precio con tachado. Server component.
 */
export function AnvogueProductCard({ product }: { product: Product }) {
  const href = `/productos/${product.slug}/`;
  const hasDiscount = product.priceNormal > product.priceWeb && product.discount > 0;

  return (
    <div className="group">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F7F7F7]">
        {hasDiscount && (
          <span className="absolute left-3 top-3 z-[1] rounded-full bg-[#DB4444] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            -{product.discount}%
          </span>
        )}
        <Link href={href} className="block h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <Link
          href={href}
          aria-label="Ver producto"
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 translate-y-3 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold uppercase tracking-wide text-[#1F1F1F] opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Eye size={16} /> Ver
        </Link>
      </div>

      <div className="mt-3">
        <Link href={href}>
          <h3 className="line-clamp-2 text-sm font-medium text-[#1F1F1F] transition-colors hover:text-[#DB4444]">
            {product.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-base font-semibold text-[#1F1F1F]">
            {formatGs(product.priceWeb)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-[#A0A0A0] line-through">
              {formatGs(product.priceNormal)}
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <StockBadge sku={product.sku ?? ""} />
        </div>
      </div>
    </div>
  );
}
