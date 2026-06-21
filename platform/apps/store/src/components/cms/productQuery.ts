/**
 * Traduce las props de query de un bloque del constructor a los params de la API
 * `/catalog/products`. Mantiene paridad con `buildProductParams` del admin
 * (apps/admin/src/components/chai/blocks.tsx). Cubre el set de filtros tipo
 * Elementor: origen, categoría, marca, búsqueda, orden, stock, rango de precio,
 * offset y selección manual.
 *
 * Módulo plano (sin "use client"): lo consume tanto ChaiRender (server) como los
 * bloques cliente.
 */
export function buildProductQuery(b: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = { status: "published" };
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const source = s(b.source) || "all";
  if (source === "onPromo") out.onPromo = "true";
  if (source === "featured") out.featured = "true";
  if (source === "manual" && b.ids) out.ids = s(b.ids);
  if (b.categorySlug) out.category = s(b.categorySlug);
  if (b.brand) out.brand = s(b.brand);
  if (b.q) out.q = s(b.q);
  if (b.inStock) out.inStock = "true";
  if (n(b.priceMin) > 0) out.priceMin = String(n(b.priceMin));
  if (n(b.priceMax) > 0) out.priceMax = String(n(b.priceMax));
  if (n(b.offset) > 0) out.offset = String(n(b.offset));
  out.sort =
    source === "newest"
      ? "createdAt:desc"
      : b.orderBy === "random"
        ? "random"
        : `${s(b.orderBy) || "createdAt"}:${s(b.order) || "desc"}`;
  return out;
}
