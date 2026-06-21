import type { NavLink } from "@/types";
import { formatMoney } from "@/lib/money";

/**
 * @deprecated Usar `useMoney()` (componentes cliente) o `formatMoney()` (server),
 * que toman la moneda + locale del tenant. Wrapper conservado para imports
 * residuales; delega a `formatMoney` con la moneda histórica del store (PYG) y
 * evita divergencia con la otra definición en `@/lib/format`.
 */
export function formatGs(value: number): string {
  return formatMoney(value ?? 0, { currency: "PYG", locale: "es-PY" });
}

/**
 * Links del top bar (navegación de sitio, NO datos de catálogo). Los datos del
 * negocio (productos, categorías, slides, banners, sucursales) se consumen del
 * backend vía lib/api. Esto es solo navegación estática del chrome.
 */
export const TOP_NAV: NavLink[] = [
  { label: "Sucursales", href: "/sucursales/" },
  { label: "Trabaja con Nosotros", href: "#" },
  { label: "¿Donde está mi pedido?", href: "/rastrear-pedido/" },
];
