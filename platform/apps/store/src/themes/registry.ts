/**
 * Sistema multi-tema del storefront.
 * El tema activo se resuelve desde `store_config.theme` (editable en el admin),
 * con override por env `NEXT_PUBLIC_THEME` para previsualizar. White-label /
 * multi-rubro: cada tema es un set de componentes (chrome + home) intercambiable.
 */
export type ThemeKey = "base" | "ekomart" | "anvogue";

export const THEMES: { key: ThemeKey; name: string; description: string }[] = [
  {
    key: "base",
    name: "Base (Bacola)",
    description: "Tema farmacia/grocery basado en Bacola. Naranja, denso, orientado a catálogo.",
  },
  {
    key: "ekomart",
    name: "Ekomart",
    description: "Tema grocery/market moderno (Bootstrap). Verde, amplio, con carruseles.",
  },
  {
    key: "anvogue",
    name: "Anvogue",
    description: "Tema multipropósito moderno (fashion/retail). Limpio, minimalista, Tailwind.",
  },
];

const VALID = new Set<ThemeKey>(["base", "ekomart", "anvogue"]);

export function normalizeTheme(t?: string | null): ThemeKey {
  return t && VALID.has(t as ThemeKey) ? (t as ThemeKey) : "base";
}

/**
 * Override de los tokens de marca (--brand-*) por tema, para re-tintar overlays
 * y bloques compartidos (modal, mini-carrito, bloques del builder) sin
 * reescribirlos: las clases brand-gradient/brand-orange heredan estas vars.
 * Devuelve un map de CSS custom properties (usable como `style`). farmatotal =
 * sin override (usa los tokens globales / white-label del store).
 */
export function themeAccentVars(_theme: ThemeKey): Record<string, string> {
  // White-label: el color de marca lo define el admin (store_config.colors) y se
  // inyecta en :root vía brandColorVars. Ya NO hay override de acento por tema, así
  // los 3 temas reflejan el color elegido en Admin → Apariencia. (Se conserva la
  // firma para los wrappers que la aplican como style.)
  return {};
}

/**
 * Resuelve el tema activo (server). env > store_config (fresco) > default.
 * Lee `store_config` sin caché para que el cambio de tema desde el admin sea
 * inmediato (a diferencia del resto de settings que revalidan cada 30s).
 */
export async function getActiveTheme(): Promise<ThemeKey> {
  const envTheme = process.env.NEXT_PUBLIC_THEME;
  if (envTheme) return normalizeTheme(envTheme);
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${base}/cms/settings/store_config`, { cache: "no-store" });
    if (!res.ok) return "base";
    const data = (await res.json()) as { value?: { theme?: string } };
    return normalizeTheme(data?.value?.theme);
  } catch {
    return "base";
  }
}
