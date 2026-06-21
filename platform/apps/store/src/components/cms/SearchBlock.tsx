"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

// Reconocimiento de voz: API nativa del navegador (sin dependencias). Se usa solo
// si el navegador la soporta; el resultado del dictado dispara la MISMA búsqueda
// por texto contra el API (no es un motor de voz aparte).
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

/**
 * Bloque data-bound "Resultados de búsqueda" del builder. Lee el término de la
 * URL (`?q=`), trae productos del catálogo del tenant (`/catalog/products?q=`) y
 * los muestra con la grilla + badges de stock del tema activo (ProductCard se
 * re-tinta solo). La URL `?q=` es la única fuente de verdad: el formulario de
 * texto, el dictado por voz y el botón de escaneo navegan a `?q=...` y eso
 * re-dispara la búsqueda. Editable/posicionable desde el builder.
 *
 * Voz: usa la Web Speech API nativa del navegador (sin librerías); si el
 * navegador no la soporta, el botón se oculta.
 *
 * Escaneo de código de barras: NO existe un componente/plugin de escáner
 * reutilizable ni una librería de escaneo en el proyecto, así que el botón
 * "Escanear" cae a la búsqueda por texto (enfoca el input para tipear/pegar el
 * código, que se busca igual contra el API). Cuando se agregue un componente de
 * escáner reutilizable, basta con cablear su resultado a `runSearch(code)`.
 */
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

  // Sincroniza el input con la URL (back/forward, dictado, escaneo).
  useEffect(() => {
    setTerm(q);
  }, [q]);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  // Trae resultados cuando cambia `?q=`. Mismo patrón data-bound que CatalogBlock:
  // fetch directo al API del tenant con los headers de tenant.
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

  // Punto único de disparo: navega a `?q=...` preservando el resto del querystring.
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

  // Voz: dicta → rellena el input → corre la misma búsqueda por texto.
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

  // Escaneo: sin componente/librería de escáner reutilizable, cae a texto.
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
            <input
              ref={inputRef}
              type="search"
              name="q"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={placeholder}
              aria-label="Buscar productos"
              className="h-12 w-full rounded-full border border-[#ededf1] bg-search-bg pl-5 pr-12 text-sm text-brand-text placeholder:text-brand-muted transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="brand-gradient focus-ring absolute right-1 top-1 flex size-10 items-center justify-center rounded-full text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.78l3.123 3.124a.75.75 0 1 0 1.061-1.06l-3.124-3.124A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Escanear código de barras — cae a búsqueda por texto (sin escáner reutilizable). */}
          <button
            type="button"
            onClick={onScan}
            aria-label="Escanear código de barras"
            title="Escanear código de barras"
            className="focus-ring flex size-12 flex-none items-center justify-center rounded-full border border-[#ededf1] bg-white text-brand-text transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
              <path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14" />
            </svg>
          </button>

          {/* Voz — Web Speech API nativa; dispara la misma búsqueda por texto. */}
          {voiceSupported && (
            <button
              type="button"
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
            </button>
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
