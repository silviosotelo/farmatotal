"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Button, Select } from "@platform/ui";
import { ProductCard } from "@/components/ProductCard";
import { CatalogStockProvider } from "@/themes/CatalogStock";
import { tenantHeaders } from "@/lib/tenant";
import type { Product } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PER_PAGE_OPTIONS = [24, 48, 96];

type SelOpt = { value: string; label: string };

const SORTS: SelOpt[] = [
  { value: "relevancia", label: "Orden predeterminado" },
  { value: "precio-asc", label: "Precio: bajo a alto" },
  { value: "precio-desc", label: "Precio: alto a bajo" },
  { value: "nombre-az", label: "Nombre A-Z" },
];

const SORT_API: Record<string, string | undefined> = {
  "precio-asc": "priceWeb:asc",
  "precio-desc": "priceWeb:desc",
  "nombre-az": "title:asc",
};

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
 * Bloque "Catálogo" del builder. Mismo layout que la grilla nativa (ProductGrid):
 * toolbar con filtro de precio + orden + cantidad por página, grilla y paginación.
 * Server-backed (orden/precio/paginación van al backend) para escalar a miles de
 * productos. `query` aporta filtros fijos del bloque (categoría/marca).
 */
export function CatalogBlock({
  perPage: perPageProp = 24,
  title,
  className,
  query,
}: {
  perPage?: number;
  title?: string;
  columns?: number;
  className?: string;
  query?: Record<string, string>;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [sort, setSort] = useState("relevancia");
  const [perPage, setPerPage] = useState(perPageProp);
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceApplied, setPriceApplied] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const firstRender = useRef(true);

  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [catId, setCatId] = useState("");
  const [brandId, setBrandId] = useState("");

  useEffect(() => {
    fetch(`${API}/catalog/categories`, { headers: tenantHeaders() })
      .then((r) => r.json())
      .then((d) => setCats(((d.data as { id: string; name: string }[]) || []).map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
    fetch(`${API}/catalog/brands`, { headers: tenantHeaders() })
      .then((r) => r.json())
      .then((d) => setBrands(((d.data as { id: string; name: string }[]) || []).map((b) => ({ id: b.id, name: b.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPriceApplied({ min: minPrice, max: maxPrice }), 450);
    return () => clearTimeout(t);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    if (firstRender.current) return;
    setPage(1);
  }, [sort, perPage, priceApplied, catId, brandId]);

  const qkey = JSON.stringify(query || {});
  useEffect(() => {
    const qs = new URLSearchParams({ status: "published", ...(query || {}) });
    qs.set("page", String(page));
    qs.set("perPage", String(perPage));
    qs.delete("offset");
    const apiSort = SORT_API[sort];
    if (apiSort) qs.set("sort", apiSort);
    if (priceApplied.min) qs.set("priceMin", priceApplied.min);
    if (priceApplied.max) qs.set("priceMax", priceApplied.max);
    if (catId) qs.set("categoryId", catId);
    if (brandId) qs.set("brandId", brandId);
    setLoaded(false);
    fetch(`${API}/catalog/products?${qs.toString()}`, { headers: tenantHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setItems(((d.data as Record<string, unknown>[]) || []).map(adapt));
        setTotal(Number(d.total) || 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    firstRender.current = false;
  }, [page, perPage, sort, priceApplied, catId, brandId, qkey]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const skus = items.map((p) => p.sku).filter((s): s is string => !!s);

  const pageNumbers = useMemo(
    () =>
      Array.from({ length: totalPages }, (_, i) => i + 1).filter(
        (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2,
      ),
    [totalPages, page],
  );

  const sortOpt = SORTS.find((s) => s.value === sort) ?? SORTS[0];
  const perPageOpt: SelOpt = { value: String(perPage), label: `Mostrar ${perPage}` };

  return (
    <CatalogStockProvider skus={skus}>
      <section className={className || "ft-container py-6"}>
        {title ? <h1 className="mb-4 font-heading text-2xl font-bold text-brand-text">{title}</h1> : null}

        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#ededf1] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-text">Filtrar por precio</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                placeholder="Mín"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                aria-label="Precio mínimo"
                size="md"
                className="w-24"
              />
              <span className="text-brand-muted">–</span>
              <Input
                type="number"
                min={0}
                placeholder="Máx"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                aria-label="Precio máximo"
                size="md"
                className="w-24"
              />
            </div>
            <Select
              value={catId ? { value: catId, label: cats.find((c) => c.id === catId)?.name ?? catId } : null}
              onChange={(opt) => setCatId((opt as SelOpt | null)?.value ?? "")}
              options={cats.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Todas las categorías"
              isClearable
              className="min-w-[160px]"
            />
            <Select
              value={brandId ? { value: brandId, label: brands.find((b) => b.id === brandId)?.name ?? brandId } : null}
              onChange={(opt) => setBrandId((opt as SelOpt | null)?.value ?? "")}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Todas las marcas"
              isClearable
              className="min-w-[140px]"
            />
            <span className="text-sm text-brand-muted">
              {total.toLocaleString("es-PY")} resultado{total !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={sortOpt}
              onChange={(opt) => setSort((opt as SelOpt | null)?.value ?? "relevancia")}
              options={SORTS}
              isSearchable={false}
              className="min-w-[200px]"
            />
            <Select
              value={perPageOpt}
              onChange={(opt) => setPerPage(Number((opt as SelOpt | null)?.value ?? "24"))}
              options={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: `Mostrar ${n}` }))}
              isSearchable={false}
              className="min-w-[120px]"
            />
          </div>
        </div>

        {/* Grilla / vacío */}
        {loaded && items.length === 0 ? (
          <div className="py-16 text-center text-brand-muted">
            <p className="text-lg font-medium">No se encontraron productos</p>
            <p className="mt-1 text-sm">Intentá ajustar los filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-1">
            <Button
              variant="default"
              size="md"
              shape="circle"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              ‹
            </Button>
            {pageNumbers.map((n, idx, arr) => (
              <span key={n} className="flex items-center gap-1">
                {idx > 0 && n - arr[idx - 1] > 1 ? <span className="px-1 text-brand-muted">…</span> : null}
                <Button
                  variant={n === page ? "solid" : "default"}
                  size="md"
                  shape="circle"
                  onClick={() => setPage(n)}
                  aria-current={n === page ? "page" : undefined}
                >
                  {n}
                </Button>
              </span>
            ))}
            <Button
              variant="default"
              size="md"
              shape="circle"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              ›
            </Button>
          </div>
        )}
      </section>
    </CatalogStockProvider>
  );
}
