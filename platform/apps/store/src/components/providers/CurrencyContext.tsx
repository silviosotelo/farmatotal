"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { formatMoney, type MoneyConfig } from "@/lib/money";

/**
 * Moneda + locale del tenant para componentes cliente. Se siembra en el layout
 * desde getStoreConfig (config-driven, sin hardcodear ₲/es-PY). Componentes cliente
 * formatean con `useMoney()`.
 */
const CurrencyContext = createContext<MoneyConfig>({ currency: "PYG", locale: "es-PY" });

export function CurrencyProvider({
  currency,
  locale,
  children,
}: MoneyConfig & { children: ReactNode }) {
  const value = useMemo(() => ({ currency, locale }), [currency, locale]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): MoneyConfig {
  return useContext(CurrencyContext);
}

/** Devuelve un formateador de moneda ligado a la config del tenant. */
export function useMoney(): (valueMinor: number) => string {
  const cfg = useContext(CurrencyContext);
  return useCallback((v: number) => formatMoney(v, cfg), [cfg.currency, cfg.locale]);
}
