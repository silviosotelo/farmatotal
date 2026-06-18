"use client";

import { useState, useMemo } from "react";
import type { Product } from "@/types";
import { ProductCard } from "@/components/ProductCard";

type SortKey = "relevancia" | "precio-asc" | "precio-desc" | "descuento" | "nombre-az";

const PER_PAGE_OPTIONS = [12, 24, 36] as const;

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function ProductGrid({ products, title }: { products: Product[]; title?: string }) {
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("relevancia");
  const [perPage, setPerPage] = useState<number>(12);
  const [page, setPage] = useState<number>(1);

  const filtered = useMemo(() => {
    const min = minPrice !== "" ? Number(minPrice) : -Infinity;
    const max = maxPrice !== "" ? Number(maxPrice) : Infinity;
    return products.filter((p) => p.priceWeb >= min && p.priceWeb <= max);
  }, [products, minPrice, maxPrice]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "precio-asc":
        return arr.sort((a, b) => a.priceWeb - b.priceWeb);
      case "precio-desc":
        return arr.sort((a, b) => b.priceWeb - a.priceWeb);
      case "descuento":
        return arr.sort((a, b) => b.discount - a.discount);
      case "nombre-az":
        return arr.sort((a, b) => a.title.localeCompare(b.title, "es"));
      default:
        return arr;
    }
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = clamp(page, 1, totalPages);
  const pageItems = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  function goPage(p: number) {
    setPage(clamp(p, 1, totalPages));
  }

  function handleSort(val: SortKey) {
    setSort(val);
    setPage(1);
  }

  function handlePerPage(val: number) {
    setPerPage(val);
    setPage(1);
  }

  function handleMinPrice(val: string) {
    setMinPrice(val);
    setPage(1);
  }

  function handleMaxPrice(val: string) {
    setMaxPrice(val);
    setPage(1);
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#ededf1] pb-4">
        {/* Left: price filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-text">
            Filtrar por precio
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              placeholder="Mín ₲"
              value={minPrice}
              onChange={(e) => handleMinPrice(e.target.value)}
              aria-label="Precio mínimo"
              className="h-8 w-24 rounded border border-[#ededf1] bg-white px-2 text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
            />
            <span className="text-brand-muted">–</span>
            <input
              type="number"
              min={0}
              placeholder="Máx ₲"
              value={maxPrice}
              onChange={(e) => handleMaxPrice(e.target.value)}
              aria-label="Precio máximo"
              className="h-8 w-24 rounded border border-[#ededf1] bg-white px-2 text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
            />
          </div>
          <span className="text-sm text-brand-muted">
            {sorted.length} resultado{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Right: sort + per-page */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value as SortKey)}
            aria-label="Ordenar productos"
            className="h-10 rounded border border-[#ededf1] bg-white px-3 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
          >
            <option value="relevancia">Orden predeterminado</option>
            <option value="precio-asc">Precio: bajo a alto</option>
            <option value="precio-desc">Precio: alto a bajo</option>
            <option value="descuento">Mayor descuento</option>
            <option value="nombre-az">Nombre A-Z</option>
          </select>
          <select
            value={perPage}
            onChange={(e) => handlePerPage(Number(e.target.value))}
            aria-label="Productos por página"
            className="h-10 rounded border border-[#ededf1] bg-white px-3 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Mostrar {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid or empty state */}
      {pageItems.length === 0 ? (
        <div className="py-16 text-center text-brand-muted">
          <p className="text-lg font-medium">No se encontraron productos</p>
          <p className="mt-1 text-sm">Intentá ajustar los filtros de precio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {pageItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => goPage(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Página anterior"
            className="flex size-9 items-center justify-center rounded border border-[#ededf1] text-sm text-brand-text transition-colors hover:border-brand-orange hover:text-brand-orange disabled:pointer-events-none disabled:opacity-40"
          >
            ‹
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => goPage(p)}
              aria-label={`Página ${p}`}
              aria-current={p === safePage ? "page" : undefined}
              className={
                p === safePage
                  ? "flex size-9 items-center justify-center rounded bg-brand-orange text-sm font-medium text-white"
                  : "flex size-9 items-center justify-center rounded border border-[#ededf1] text-sm text-brand-text transition-colors hover:border-brand-orange hover:text-brand-orange"
              }
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => goPage(safePage + 1)}
            disabled={safePage === totalPages}
            aria-label="Página siguiente"
            className="flex size-9 items-center justify-center rounded border border-[#ededf1] text-sm text-brand-text transition-colors hover:border-brand-orange hover:text-brand-orange disabled:pointer-events-none disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
