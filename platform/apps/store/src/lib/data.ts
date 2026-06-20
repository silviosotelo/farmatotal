import type { NavLink } from "@/types";

/** Format an integer as Guaraníes: 68000 -> "₲ 68.000" */
export function formatGs(value: number): string {
  return "₲ " + value.toLocaleString("es-PY").replace(/,/g, ".");
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
