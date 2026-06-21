import { formatMoney } from "@/lib/money";

/**
 * @deprecated Usar `useMoney()` (componentes cliente) o `formatMoney()` (server),
 * que toman la moneda + locale del tenant. Wrapper conservado para imports
 * residuales; delega a `formatMoney` con la moneda histórica del store (PYG) y
 * evita divergencia con la otra definición en `@/lib/data`.
 */
export function formatGs(value: number): string {
  return formatMoney(value ?? 0, { currency: "PYG", locale: "es-PY" });
}
