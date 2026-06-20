/**
 * Sistema multi-tema del storefront.
 * El tema activo se resuelve desde `store_config.theme` (editable en el admin),
 * con override por env `NEXT_PUBLIC_THEME` para previsualizar. White-label /
 * multi-rubro: cada tema es un set de componentes (chrome + home) intercambiable.
 */
export type ThemeKey = "farmatotal" | "ekomart" | "anvogue";

export const THEMES: { key: ThemeKey; name: string; description: string }[] = [
  {
    key: "farmatotal",
    name: "Farmatotal (Bacola)",
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

const VALID = new Set<ThemeKey>(["farmatotal", "ekomart", "anvogue"]);

export function normalizeTheme(t?: string | null): ThemeKey {
  return t && VALID.has(t as ThemeKey) ? (t as ThemeKey) : "farmatotal";
}

/**
 * Override de los tokens de marca (--brand-*) por tema, para re-tintar overlays
 * y bloques compartidos (modal, mini-carrito, bloques del builder) sin
 * reescribirlos: las clases brand-gradient/brand-orange heredan estas vars.
 * Devuelve un map de CSS custom properties (usable como `style`). farmatotal =
 * sin override (usa los tokens globales / white-label del store).
 */
export function themeAccentVars(theme: ThemeKey): Record<string, string> {
  if (theme === "ekomart") {
    return {
      "--brand-orange": "#629d23",
      "--brand-orange-ink": "#4e7d1c",
      "--brand-gradient": "linear-gradient(100deg,#7ab51d 0%,#629d23 100%)",
    };
  }
  if (theme === "anvogue") {
    return {
      "--brand-orange": "#db4444",
      "--brand-orange-ink": "#b91c1c",
      "--brand-gradient": "linear-gradient(100deg,#1f1f1f 0%,#db4444 100%)",
    };
  }
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
    if (!res.ok) return "farmatotal";
    const data = (await res.json()) as { value?: { theme?: string } };
    return normalizeTheme(data?.value?.theme);
  } catch {
    return "farmatotal";
  }
}
