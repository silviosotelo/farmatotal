import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { options } from "../db/schema/index.js";

/**
 * Impuestos per-tenant. Fuente única de la lógica (la usan tax.routes Y el checkout)
  * para que el cálculo no diverja. Config en options `mod_tax`.
 */
export const TAX_SETTINGS_KEY = "mod_tax";

export type TaxRate = { id: string; name: string; percent: number; isDefault: boolean };
export type TaxConfig = { pricesIncludeTax: boolean; rates: TaxRate[] };

/** Defaults Paraguay: IVA 10% (general), 5% (reducido), Exento. Precios IVA incluido. */
export const TAX_DEFAULTS: TaxConfig = {
  pricesIncludeTax: true,
  rates: [
    { id: "iva10", name: "IVA 10%", percent: 10, isDefault: true },
    { id: "iva5", name: "IVA 5%", percent: 5, isDefault: false },
    { id: "exento", name: "Exento", percent: 0, isDefault: false },
  ],
};

export async function readTaxConfig(tenantId: string): Promise<TaxConfig> {
  const [row] = await db
    .select()
    .from(options)
    .where(and(eq(options.tenantId, tenantId), eq(options.name, TAX_SETTINGS_KEY)))
    .limit(1);
  return (row?.value as TaxConfig) ?? TAX_DEFAULTS;
}

/** Resuelve la tasa por id, o la default, o la primera. */
export function resolveRate(cfg: TaxConfig, rateId?: string): TaxRate {
  return (
    cfg.rates.find((r) => r.id === rateId) ??
    cfg.rates.find((r) => r.isDefault) ??
    cfg.rates[0] ??
    TAX_DEFAULTS.rates[0]!
  );
}

/** Porción de impuesto de un monto, según si el precio ya lo incluye o no. */
export function taxPortion(amount: number, percent: number, included: boolean): number {
  if (percent <= 0) return 0;
  const r = percent / 100;
  return included ? Math.round(amount - amount / (1 + r)) : Math.round(amount * r);
}
