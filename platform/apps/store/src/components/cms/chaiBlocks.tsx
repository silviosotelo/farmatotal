"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type GridProduct = { id: string; title: string; priceWeb: number; priceNormal: number; onPromo?: boolean; slug: string; image: string };

function gs(n: number) {
  return "₲ " + (n ?? 0).toLocaleString("es-PY").replace(/,/g, ".");
}

/**
 * Bloque data-bound "ProductGrid" del editor visual (Chai). Refleja el bloque
 * registrado en el admin (apps/admin/src/components/chai/blocks.tsx): trae
 * productos del catálogo, filtrable por categoría.
 */
export function ChaiProductGrid({
  title,
  categorySlug,
  limit = 8,
  columns = 4,
}: {
  title?: string;
  categorySlug?: string;
  limit?: number;
  columns?: number;
}) {
  const [items, setItems] = useState<GridProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams({ perPage: String(limit || 8), status: "published" });
    if (categorySlug) qs.set("category", categorySlug);
    fetch(`${API}/catalog/products?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const list = ((d.data as Record<string, unknown>[]) || []).map((p) => ({
          id: p.id as string,
          title: p.title as string,
          priceWeb: p.priceWeb as number,
          priceNormal: p.priceNormal as number,
          onPromo: p.onPromo as boolean,
          slug: p.slug as string,
          image: (p.images as { url: string }[] | undefined)?.[0]?.url || "/products/no-img.webp",
        }));
        setItems(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [categorySlug, limit]);

  if (loaded && items.length === 0) return null;

  return (
    <section className="py-6">
      {title && <h3 className="mb-4 text-xl font-bold">{title}</h3>}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.slice(0, limit).map((p) => (
          <a
            key={p.id}
            href={`/productos/${p.slug}/`}
            className="rounded-xl border border-[#ededf1] bg-white p-3 no-underline text-inherit"
          >
            <div className="flex aspect-square items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.title} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-snug">{p.title}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-bold text-brand-orange">{gs(p.priceWeb)}</span>
              {p.onPromo && p.priceNormal > p.priceWeb && (
                <span className="text-xs text-gray-400 line-through">{gs(p.priceNormal)}</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

type ShowcaseCategory = { name: string; href: string };

/**
 * Bloque data-bound "CategoryShowcase" del editor visual (Chai). Refleja el
 * bloque registrado en el admin: trae categorías del catálogo y las muestra como
 * tiles enlazados. Theme-aware vía clases brand-* (re-tinta con el tema activo).
 */
export function ChaiCategoryShowcase({
  title,
  limit = 8,
}: {
  title?: string;
  limit?: number;
}) {
  const [items, setItems] = useState<ShowcaseCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/catalog/categories?perPage=2000`)
      .then((r) => r.json())
      .then((d) => {
        const list = ((d.data as Record<string, unknown>[]) || []).map((c) => ({
          name: c.name as string,
          href: `/categorias/${c.slug as string}/`,
        }));
        setItems(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (loaded && items.length === 0) return null;

  return (
    <section className="py-6">
      {title && <h3 className="mb-4 text-xl font-bold">{title}</h3>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.slice(0, limit).map((c) => (
          <a
            key={c.href}
            href={c.href}
            className="flex min-h-[4.5rem] items-center justify-center rounded-xl border border-[#ededf1] bg-white p-4 text-center text-sm font-medium text-inherit no-underline transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            {c.name}
          </a>
        ))}
      </div>
    </section>
  );
}
