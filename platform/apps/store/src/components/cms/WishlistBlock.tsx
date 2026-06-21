"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { CatalogStockProvider } from "@/themes/CatalogStock";
import { useWishlist } from "@/components/providers/WishlistContext";

/**
 * Bloque funcional "Mis Favoritos" del builder (estilo widget de wishlist de Woo
 * en Elementor): client-only. No hay endpoint de wishlist en el backend del
 * tenant — la lista vive en useWishlist (localStorage de invitado + respaldo por
 * usuario vía route handlers de Next). Reusa ProductCard, que ya formatea precios
 * (useMoney), badges de stock y respeta los feature-flags (useFlags) por tarjeta.
 * Se coloca/posiciona desde el builder; markup heredado de la página de favoritos.
 */
export function WishlistBlock({
  title = "Mis Favoritos",
  columns = 4,
  className,
}: {
  title?: string;
  columns?: number;
  className?: string;
} = {}) {
  const { items, count } = useWishlist();
  // Stock en vivo del catálogo para los badges de ProductCard (única atadura al
  // API del tenant disponible aquí); el snapshot guardado en favoritos puede
  // estar desactualizado. StockBadge tolera la ausencia de provider.
  const skus = items.map((p) => p.sku).filter((s): s is string => !!s);

  return (
    <CatalogStockProvider skus={skus}>
    <section className={className || "ft-container py-8"}>
      <h2 className="mb-6 font-heading text-2xl font-bold text-brand-text">{title}</h2>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-16 w-16 text-brand-muted/40"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <p className="text-base text-brand-muted">Todavía no tenés favoritos</p>
          <Link
            href="/catalogo"
            className="brand-gradient focus-ring inline-flex h-11 items-center rounded-[8px] px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-${columns}`}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
    </CatalogStockProvider>
  );
}
