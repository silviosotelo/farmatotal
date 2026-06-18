/**
 * Espejo local del registro canónico de bloques del page-builder.
 * La fuente única de verdad vive en el motor (@ft/shared-types → GET /cms/blocks).
 * Como el clone es un proyecto separado (no comparte el workspace pnpm), mantenemos
 * esta lista en sync y la validamos contra el endpoint con verifyBlockRegistry().
 */
const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

/** Bloques que el storefront sabe renderizar (PuckRender.config.components). */
export const CLONE_BLOCK_TYPES = [
  "Hero",
  "Heading",
  "Text",
  "ImageBlock",
  "Button",
  "Banner",
  "Columns",
  "ProductGrid",
  "Features",
  "FAQ",
  "CTA",
  "Testimonials",
  "BranchMap",
  "HeroSlider",
  "HomeSlider",
  "HomeCategories",
  "HomeDeals",
  "HomeFeatured",
  "HomePromoBanner",
  "Spacer",
] as const;

export type DriftReport = {
  ok: boolean;
  /** En el canónico pero el clone no renderiza (se mostrarían como fallback). */
  missingInClone: string[];
  /** El clone renderiza pero ya no existen en el canónico (código muerto). */
  extraInClone: string[];
};

/**
 * Compara el registro local contra el canónico del motor. Útil en build/dev para
 * detectar drift admin↔clone. No lanza: devuelve el reporte.
 */
export async function verifyBlockRegistry(): Promise<DriftReport> {
  let canonical: string[] = [];
  try {
    const res = await fetch(`${API}/cms/blocks`, { cache: "no-store" });
    const json = (await res.json()) as { types?: string[] };
    canonical = json.types ?? [];
  } catch {
    return { ok: true, missingInClone: [], extraInClone: [] };
  }
  const local = new Set<string>(CLONE_BLOCK_TYPES);
  const canon = new Set(canonical);
  const missingInClone = canonical.filter((t) => !local.has(t));
  const extraInClone = [...local].filter((t) => !canon.has(t));
  return { ok: missingInClone.length === 0 && extraInClone.length === 0, missingInClone, extraInClone };
}
