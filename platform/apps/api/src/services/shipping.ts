import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { options } from "../db/schema/index.js";

/**
 * Envío per-tenant. Fuente única de la lógica de costos (la usan shipping.routes Y
  * el checkout). Config en options `mod_shipping`: zonas (por ciudad) con métodos.
 */
export const SHIPPING_SETTINGS_KEY = "mod_shipping";

export type ShippingMethod = {
  id: string;
  name: string;
  type: "flat" | "free" | "pickup" | "weight";
  cost: number;
  freeFrom: number;
  perKg: number;
  active: boolean;
};
export type ShippingZone = { id: string; name: string; cities: string[]; methods: ShippingMethod[] };
export type ShippingConfig = { zones: ShippingZone[] };

export async function readShippingConfig(tenantId: string): Promise<ShippingConfig> {
  const [row] = await db
    .select()
    .from(options)
    .where(and(eq(options.tenantId, tenantId), eq(options.name, SHIPPING_SETTINGS_KEY)))
    .limit(1);
  return (row?.value as ShippingConfig) ?? { zones: [] };
}

/** Zona que cubre la ciudad, o la primera como fallback. */
export function matchZone(cfg: ShippingConfig, city?: string): ShippingZone | undefined {
  const cityLc = (city ?? "").trim().toLowerCase();
  return cfg.zones.find((z) => z.cities.some((c) => c.toLowerCase() === cityLc)) ?? cfg.zones[0];
}

/** Costo de un método según tipo y subtotal/peso. */
export function methodCost(m: ShippingMethod, subtotal: number, weight: number): number {
  if (m.type === "flat") return m.cost;
  if (m.type === "free") return m.freeFrom > 0 && subtotal < m.freeFrom ? m.cost : 0;
  if (m.type === "pickup") return 0;
  if (m.type === "weight") return Math.round(m.perKg * weight);
  return 0;
}

/** Opciones cotizadas para una ciudad + subtotal (lo usa /shipping/quote). */
export function quoteOptions(
  cfg: ShippingConfig,
  opts: { city?: string; subtotal: number; weight: number },
): { zone: { id: string; name: string } | null; options: { id: string; name: string; type: string; cost: number }[] } {
  const zone = matchZone(cfg, opts.city);
  if (!zone) return { zone: null, options: [] };
  const options = zone.methods
    .filter((m) => m.active)
    .map((m) => ({ id: m.id, name: m.name, type: m.type, cost: methodCost(m, opts.subtotal, opts.weight) }));
  return { zone: { id: zone.id, name: zone.name }, options };
}

/**
 * Costo server-authoritative de envío para el checkout. Re-resuelve la zona por
 * ciudad y el método elegido (valida que pertenezca a la zona). Si no se pasa
 * methodId, usa el primer método activo NO-pickup de la zona (transición desde el
 * store que aún manda solo pickup/delivery). Sin fallback hardcodeado por rubro.
 */
export function resolveShippingCost(
  cfg: ShippingConfig,
  opts: { methodId?: string; city?: string; subtotal: number; weight: number },
): { cost: number; methodName: string | null } {
  const zone = matchZone(cfg, opts.city);
  if (!zone) return { cost: 0, methodName: null };
  const active = zone.methods.filter((m) => m.active);
  const method = opts.methodId
    ? active.find((m) => m.id === opts.methodId)
    : active.find((m) => m.type !== "pickup");
  if (!method) return { cost: 0, methodName: null };
  return { cost: methodCost(method, opts.subtotal, opts.weight), methodName: method.name };
}
