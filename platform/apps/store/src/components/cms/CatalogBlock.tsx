"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { CatalogStockProvider } from "@/themes/CatalogStock";
import { tenantHeaders } from "@/lib/tenant";
import type { Product } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function discount(normal: number, web: number) {
  if (normal <= 0 || web >= normal) return 0;
  return Math.round(((normal - web) / normal) * 100);
}
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

/**
 * Bloque data-bound "Catálogo" del editor visual. Es un documento de página: lee
 * `?page` de la URL, trae productos del catálogo paginados y los muestra con la
 * grilla + badges de stock del tema activo (ProductCard se re-tinta solo).
 * Reemplaza a la página de catálogo hardcodeada — editable desde el builder.
 */
export function CatalogBlock({
  perPage = 48,
  title,
  columns = 5,
  className,
  query,
}: {
  perPage?: number;
  title?: string;
  columns?: number;
  className?: string;
  query?: Record<string, string>;
}) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const qkey = JSON.stringify(query || {});
  useEffect(() => {
    // La paginación (page/perPage) manda sobre el query del bloque; el resto de
    // filtros (categoría, marca, orden, stock, precio…) vienen de `query`.
    const qs = new URLSearchParams({ status: "published", ...(query || {}) });
    qs.set("page", String(page));
    qs.set("perPage", String(perPage));
    qs.delete("offset"); // el catálogo pagina por `page`, ignora offset del bloque
    setLoaded(false);
    fetch(`${API}/catalog/products?${qs.toString()}`, { headers: tenantHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setItems(((d.data as Record<string, unknown>[]) || []).map(adapt));
        setTotal(Number(d.total) || 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, qkey]);

  const pages = Math.max(1, Math.ceil(total / perPage));
  const skus = items.map((p) => p.sku).filter((s): s is string => !!s);
  const heading = title || `Catálogo${total ? ` (${total.toLocaleString("es-PY")})` : ""}`;

  const pageHref = (n: number) => {
    const q = new URLSearchParams(sp.toString());
    q.set("page", String(n));
    return `${pathname}?${q.toString()}`;
  };

  return (
    <CatalogStockProvider skus={skus}>
      <section className={className || "ft-container py-6"}>
        <h2 className="mb-4 font-heading text-xl font-bold text-brand-text">{heading}</h2>
        {loaded && items.length === 0 ? (
          <p className="py-12 text-center text-brand-muted">No hay productos para mostrar.</p>
        ) : (
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-${columns}`}>
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginación">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="focus-ring rounded-full border border-[#ededf1] px-4 py-2 text-sm font-medium text-brand-text transition hover:border-brand-orange hover:text-brand-orange">
                Anterior
              </Link>
            )}
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
              .map((n, idx, arr) => (
                <span key={n} className="flex items-center gap-2">
                  {idx > 0 && n - arr[idx - 1] > 1 && <span className="text-brand-muted">…</span>}
                  <Link
                    href={pageHref(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={`focus-ring flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition ${
                      n === page ? "bg-brand-orange text-white" : "border border-[#ededf1] text-brand-text hover:border-brand-orange hover:text-brand-orange"
                    }`}
                  >
                    {n}
                  </Link>
                </span>
              ))}
            {page < pages && (
              <Link href={pageHref(page + 1)} className="focus-ring rounded-full border border-[#ededf1] px-4 py-2 text-sm font-medium text-brand-text transition hover:border-brand-orange hover:text-brand-orange">
                Siguiente
              </Link>
            )}
          </nav>
        )}
      </section>
    </CatalogStockProvider>
  );
}
