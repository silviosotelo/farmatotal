"use client";

import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/components/providers/WishlistContext";

export default function MisFavoritosPage() {
  const { items, count } = useWishlist();

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Mis Favoritos" }]} />

      <div className="ft-container py-8">
        <h1 className="font-heading text-2xl font-bold text-brand-text mb-6">Mis Favoritos</h1>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-16 h-16 text-brand-muted/40"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <p className="text-brand-muted text-base">Todavía no tenés favoritos</p>
            <Link
              href="/catalogo"
              className="brand-gradient text-white rounded-[8px] h-11 px-6 inline-flex items-center text-sm font-semibold transition-transform active:scale-[0.98] focus-ring"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
