"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input, Button } from "@platform/ui";
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

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function SearchBlock({
  perPage = 48,
  columns = 5,
  className,
  placeholder = "¿Qué estás buscando?",
}: {
  perPage?: number;
  columns?: number;
  className?: string;
  placeholder?: string;
} = {}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const q = (sp.get("q") ?? "").trim();

  const [term, setTerm] = useState(q);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTerm(q);
  }, [q]);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  useEffect(() => {
    if (!q) {
      setItems([]);
      setTotal(0);
      setLoaded(true);
      return;
    }
    const qs = new URLSearchParams({ status: "published", q });
    qs.set("perPage", String(perPage));
    setLoaded(false);
    fetch(`${API}/catalog/products?${qs.toString()}`, { headers: tenantHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setItems(((d.data as Record<string, unknown>[]) || []).map(adapt));
        setTotal(Number(d.total) || 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [q, perPage]);

  const runSearch = (value: string) => {
    const next = value.trim();
    const params = new URLSearchParams(sp.toString());
    if (next) params.set("q", next);
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(term);
  };

  const onVoice = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition || listening) return;
    const rec = new Recognition();
    rec.lang = navigator.language || "es";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setTerm(transcript);
        runSearch(transcript);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const onScan = () => {
    inputRef.current?.focus();
  };

  const skus = items.map((p) => p.sku).filter((s): s is string => !!s);
  const heading = q
    ? `${total.toLocaleString()} resultado${total === 1 ? "" : "s"} para «${q}»`
    : "Buscar productos";

  return (
    <CatalogStockProvider skus={skus}>
      <section className={className || "ft-container py-6"}>
        <form onSubmit={onSubmit} autoComplete="off" className="relative mb-6 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="search"
              name="q"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={placeholder}
              aria-label="Buscar productos"
              className="h-12 w-full rounded-full border border-[#ededf1] bg-search-bg pl-5 pr-12 text-sm text-brand-text placeholder:text-brand-muted transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
            <Button
              type="submit"
              variant="plain"
              aria-label="Buscar"
              className="brand-gradient focus-ring absolute right-1 top-1 flex size-10 items-center justify-center rounded-full text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.78l3.123 3.124a.75.75 0 1 0 1.061-1.06l-3.124-3.124A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
              </svg>
            </Button>
          </div>

          <Button
            type="button"
            variant="plain"
            onClick={onScan}
            aria-label="Escanear código de barras"
            title="Escanear código de barras"
            className="focus-ring flex size-12 flex-none items-center justify-center rounded-full border border-[#ededf1] bg-white text-brand-text transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
              <path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14" />
            </svg>
          </Button>

          {voiceSupported && (
            <Button
              type="button"
              variant="plain"
              onClick={onVoice}
              aria-label="Buscar por voz"
              aria-pressed={listening}
              title="Buscar por voz"
              className={`focus-ring flex size-12 flex-none items-center justify-center rounded-full border transition-colors ${
                listening
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-[#ededf1] bg-white text-brand-text hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
                <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
              </svg>
            </Button>
          )}
        </form>

        {q && <h2 className="mb-4 font-heading text-xl font-bold text-brand-text">{heading}</h2>}

        {!q ? (
          <p className="py-12 text-center text-brand-muted">Ingresá un término para ver resultados.</p>
        ) : loaded && items.length === 0 ? (
          <div className="py-12 text-center text-brand-muted">
            <p className="mb-4 text-base">No encontramos productos que coincidan con tu búsqueda.</p>
            <Link
              href="/catalogo"
              className="brand-gradient focus-ring inline-block rounded-[30px] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Ver catálogo completo
            </Link>
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-${columns}`}>
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </CatalogStockProvider>
  );
}
