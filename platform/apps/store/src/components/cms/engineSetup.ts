/**
 * Registro de fuentes de binding del motor `@platform/engine` para el store.
 * Las fuentes resuelven contra el `ctx` que arma ChaiRender (datos reales de la
 * tienda / entidad). Idempotente.
 */
import { registerBindingSource } from "@platform/engine";

let done = false;

export function ensureEngineBindings(): void {
  if (done) return;
  done = true;
  registerBindingSource({
    id: "store.name",
    label: "Nombre de la tienda",
    resolver: (_a, ctx) => (ctx as { store?: { brandName?: string } })?.store?.brandName ?? "",
  });
  registerBindingSource({
    id: "store.description",
    label: "Descripción de la tienda",
    resolver: (_a, ctx) => (ctx as { store?: { description?: string } })?.store?.description ?? "",
  });
  // Bindings por ítem (dentro de un Loop): ctx.item = producto actual.
  const itemField = (k: string) => (_a: unknown, ctx: unknown) =>
    (ctx as { item?: Record<string, unknown> })?.item?.[k] ?? "";
  for (const k of ["title", "slug", "image", "priceWeb", "priceNormal", "sku"]) {
    registerBindingSource({ id: `item.${k}`, label: `Ítem · ${k}`, resolver: itemField(k) });
  }
}
