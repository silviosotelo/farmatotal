"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Product } from "@/types";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { CatalogStockProvider } from "@/themes/CatalogStock";
import { tenantHeaders } from "@/lib/tenant";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function discount(normal: number, web: number) {
  if (normal <= 0 || web >= normal) return 0;
  return Math.round(((normal - web) / normal) * 100);
}

// Adapta el producto del backend del tenant al tipo Product de la grilla.
// Mismo patrón local que SearchBlock: no importamos adaptProduct de @/lib/api
// porque ese módulo es server-side.
function adapt(p: Record<string, unknown>): Product {
  const imgs = p.images as { url: string; isPrimary?: boolean }[] | undefined;
  const primary = imgs?.find((i) => i.isPrimary)?.url || imgs?.[0]?.url;
  return {
    id: p.id as string,
    slug: p.slug as string,
    title: p.title as string,
    image: primary || "/products/no-img.webp",
    priceNormal: p.priceNormal as number,
    priceWeb: p.priceWeb as number,
    discount: discount(p.priceNormal as number, p.priceWeb as number),
    sku: p.sku as string,
    stock: p.stockCached as number,
  };
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Trae resultados del catálogo del tenant (mismo endpoint y headers que SearchBlock).
  useEffect(() => {
    if (!q || q.length < 2) {
      setProducts([]);
      return;
    }
    const qs = new URLSearchParams({ status: "published", q });
    qs.set("perPage", "50");
    setLoading(true);
    fetch(`${API}/catalog/products?${qs.toString()}`, { headers: tenantHeaders() })
      .then((r) => r.json())
      .then((d) => setProducts(((d.data as Record<string, unknown>[]) || []).map(adapt)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q]);

  const skus = products.map((p) => p.sku).filter((s): s is string => !!s);

  return (
    <CatalogStockProvider skus={skus}>
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
    </CatalogStockProvider>
  );
}

export default function SearchFallback() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
