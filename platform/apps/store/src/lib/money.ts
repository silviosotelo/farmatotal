/**
 * Dinero multi-moneda, config-driven (white-label). Los montos se almacenan SIEMPRE
 * como enteros en la unidad MENOR de la moneda (PYG: 0 decimales → el entero es el
 * valor; USD: centavos). El formateo usa Intl con la moneda + locale del tenant, así
 * el símbolo y los decimales salen correctos sin hardcodear ₲/es-PY.
 *
 * Server-safe y client-safe (sin "use client"): lo usan páginas server y componentes
 * cliente (vía CurrencyContext / useMoney).
 */
export type MoneyConfig = { currency: string; locale: string };

const decimalsCache: Record<string, number> = {};

/** Decimales de la moneda según Intl (PYG=0, USD=2, ...). */
export function currencyDecimals(currency: string): number {
  if (currency in decimalsCache) return decimalsCache[currency]!;
  let d = 2;
  try {
    d = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    d = 2;
  }
  decimalsCache[currency] = d;
  return d;
}

/** Formatea un monto en unidad menor a string de moneda (ej. 1050 USD -> "$10.50"). */
export function formatMoney(valueMinor: number, cfg: MoneyConfig): string {
  const decimals = currencyDecimals(cfg.currency);
  const major = (valueMinor ?? 0) / Math.pow(10, decimals);
  try {
    return new Intl.NumberFormat(cfg.locale, { style: "currency", currency: cfg.currency }).format(major);
  } catch {
    return `${new Intl.NumberFormat(cfg.locale || "en").format(major)} ${cfg.currency}`;
  }
}

/** Mayor (lo que tipea el admin, ej. 10.50) -> menor (entero almacenado, ej. 1050). */
export function toMinor(major: number, currency: string): number {
  return Math.round((major ?? 0) * Math.pow(10, currencyDecimals(currency)));
}

/** Menor (almacenado) -> mayor (para editar en el admin). */
export function toMajor(minor: number, currency: string): number {
  return (minor ?? 0) / Math.pow(10, currencyDecimals(currency));
}
