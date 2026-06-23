"use client";

import { useState, useMemo } from "react";
import { Input, Button, Select } from "@platform/ui";
import type { Product } from "@/types";
import { ProductCard } from "@/components/ProductCard";

type SortKey = "relevancia" | "precio-asc" | "precio-desc" | "descuento" | "nombre-az";
type SelOpt = { value: string; label: string };

const PER_PAGE_OPTIONS = [12, 24, 36] as const;

const SORT_OPTIONS: SelOpt[] = [
  { value: "relevancia", label: "Orden predeterminado" },
  { value: "precio-asc", label: "Precio: bajo a alto" },
  { value: "precio-desc", label: "Precio: alto a bajo" },
  { value: "descuento", label: "Mayor descuento" },
  { value: "nombre-az", label: "Nombre A-Z" },
];

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

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const sortOpt = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[0];
  const perPageOpt: SelOpt = { value: String(perPage), label: `Mostrar ${perPage}` };

  return (
    <div>
      {title && <h1 className="mb-6 font-heading text-2xl font-bold text-brand-text">{title}</h1>}

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#ededf1] pb-4">
        {/* Left: price filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-text">
            Filtrar por precio
          </span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              placeholder="Mín"
              value={minPrice}
              onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
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
              onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
              aria-label="Precio máximo"
              size="md"
              className="w-24"
            />
          </div>
          <span className="text-sm text-brand-muted">
            {sorted.length} resultado{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Right: sort + per-page */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={sortOpt}
            onChange={(opt) => handleSort(((opt as SelOpt | null)?.value ?? "relevancia") as SortKey)}
            options={SORT_OPTIONS}
            isSearchable={false}
            aria-label="Ordenar productos"
            className="min-w-[200px]"
          />
          <Select
            value={perPageOpt}
            onChange={(opt) => handlePerPage(Number((opt as SelOpt | null)?.value ?? "12"))}
            options={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: `Mostrar ${n}` }))}
            isSearchable={false}
            aria-label="Productos por página"
            className="min-w-[130px]"
          />
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
          <Button
            type="button"
            variant="default"
            size="md"
            shape="circle"
            disabled={safePage === 1}
            onClick={() => goPage(safePage - 1)}
            aria-label="Página anterior"
          >
            ‹
          </Button>
          {pageNumbers.map((p) => (
            <Button
              key={p}
              type="button"
              variant={p === safePage ? "solid" : "default"}
              size="md"
              shape="circle"
              onClick={() => goPage(p)}
              aria-label={`Página ${p}`}
              aria-current={p === safePage ? "page" : undefined}
            >
              {p}
            </Button>
          ))}
          <Button
            type="button"
            variant="default"
            size="md"
            shape="circle"
            disabled={safePage === totalPages}
            onClick={() => goPage(safePage + 1)}
            aria-label="Página siguiente"
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
