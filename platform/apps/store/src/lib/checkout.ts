"use client";

/**
 * Helpers config-driven del checkout (cliente). Hablan directo con apps/api del
 * platform (igual que BranchStock), sin hardcodear costos/impuestos/medios de pago.
 * El backend sigue siendo la autoridad del total; esto es para mostrar y elegir.
 */
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ── Envío ──────────────────────────────────────────────────────────────────
export type ShippingOption = { id: string; name: string; type: string; cost: number };
type QuoteResp = { zone: { id: string; name: string } | null; options: ShippingOption[] };

/**
 * Cotiza los métodos de envío para una ciudad + subtotal (GET /shipping/quote).
 * Selecciona la primera opción por defecto. Si no hay config/zona, devuelve [].
 */
export function useShippingQuote(opts: {
  enabled: boolean;
  city: string;
  subtotal: number;
}): {
  options: ShippingOption[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  loading: boolean;
} {
  const { enabled, city, subtotal } = opts;
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      setSelectedId(null);
      return;
    }
    let alive = true;
    setLoading(true);
    // Debounce para no cotizar en cada tecla de la ciudad.
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (city.trim()) qs.set("city", city.trim());
      qs.set("subtotal", String(subtotal));
      fetch(`${API}/shipping/quote?${qs.toString()}`)
        .then((r) => (r.ok ? (r.json() as Promise<QuoteResp>) : null))
        .then((d) => {
          if (!alive) return;
          const next = d?.options ?? [];
          setOptions(next);
          setSelectedId((prev) =>
            prev && next.some((o) => o.id === prev) ? prev : (next[0]?.id ?? null),
          );
        })
        .catch(() => {
          if (alive) {
            setOptions([]);
            setSelectedId(null);
          }
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [enabled, city, subtotal]);

  return { options, selectedId, setSelectedId, loading };
}

// ── Impuesto ─────────────────────────────────────────────────────────────────
export type TaxRate = { id: string; name: string; percent: number; isDefault: boolean };
export type TaxConfig = { pricesIncludeTax: boolean; rates: TaxRate[] };

/** Lee la config de impuestos del tenant (GET /tax/config). null mientras carga / si falla. */
export function useTaxConfig(): TaxConfig | null {
  const [cfg, setCfg] = useState<TaxConfig | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/tax/config`)
      .then((r) => (r.ok ? (r.json() as Promise<TaxConfig>) : null))
      .then((d) => {
        if (alive && d) setCfg(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

/** Tasa default (la marcada como default, o la primera). null si no hay tasas. */
export function defaultRate(cfg: TaxConfig | null): TaxRate | null {
  if (!cfg || cfg.rates.length === 0) return null;
  return cfg.rates.find((r) => r.isDefault) ?? cfg.rates[0] ?? null;
}

/** Porción de impuesto de un monto (mismo cálculo que el backend taxPortion). */
export function computeTax(base: number, percent: number, included: boolean): number {
  if (percent <= 0) return 0;
  const r = percent / 100;
  return included ? Math.round(base - base / (1 + r)) : Math.round(base * r);
}

// ── Medios de pago ───────────────────────────────────────────────────────────
export type PaymentMethodCfg = { key: string; name: string; enabled: boolean };

/**
 * Lee los medios de pago del tenant (GET /payments/methods). null mientras carga
 * o si falla → el componente cae a mostrar todos (no rompe el flujo actual).
 */
export function usePaymentMethods(): PaymentMethodCfg[] | null {
  const [methods, setMethods] = useState<PaymentMethodCfg[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/payments/methods`)
      .then((r) => (r.ok ? (r.json() as Promise<{ data?: PaymentMethodCfg[] }>) : null))
      .then((d) => {
        if (alive && d?.data) setMethods(d.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return methods;
}

/**
 * ¿Está habilitado el medio de pago `key`? Si la config aún no cargó o falló
 * (methods === null) devuelve true → comportamiento actual (mostrar todos).
 */
export function isPaymentEnabled(methods: PaymentMethodCfg[] | null, key: string): boolean {
  if (methods === null) return true;
  const m = methods.find((x) => x.key === key);
  return m ? m.enabled : false;
}
