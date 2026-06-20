"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Product } from "@/types";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGrid } from "@/components/shop/ProductGrid";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) { setProducts([]); return; }
    setLoading(true);
    fetch(`/api/products?q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => setProducts(data.items ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <main className="flex-1">
      <Breadcrumbs
        items={
          q
            ? [{ label: "Catálogo", href: "/catalogo" }, { label: `Resultados de búsqueda para "${q}"` }]
            : [{ label: "Catálogo", href: "/catalogo" }, { label: "Búsqueda" }]
        }
      />
      <div className="ft-container py-6">
        {q ? (
          <>
            {loading ? (
              <p className="mb-6 text-lg font-semibold text-brand-text">Buscando...</p>
            ) : (
              <>
                <p className="mb-6 text-lg font-semibold text-brand-text">
                  {products.length} resultado{products.length !== 1 ? "s" : ""} para{" "}
                  <span className="text-brand-orange">«{q}»</span>
                </p>
                {products.length > 0 ? (
                  <ProductGrid products={products} />
                ) : (
                  <div className="py-12 text-center text-brand-muted">
                    <p className="mb-4 text-base">No encontramos productos que coincidan con tu búsqueda.</p>
                    <Link
                      href="/catalogo"
                      className="brand-gradient inline-block rounded-[30px] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Ver catálogo completo
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-brand-muted">
            <p className="mb-4 text-base">Ingresá un término en el buscador para ver resultados.</p>
            <Link
              href="/catalogo"
              className="brand-gradient inline-block rounded-[30px] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Ver catálogo
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BuscarPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
