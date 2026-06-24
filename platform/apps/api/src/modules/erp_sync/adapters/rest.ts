/**
 * Adapter REST genérico (sin código por ERP): hace GET a un endpoint JSON configurable
 * y devuelve el array como RawRecord[]. El mapeo configurable (erp_field_mappings) + el
 * generic-import lo transforman y upsertean. Soporta token Bearer y TLS laxo opcional.
 */
import { Agent, fetch } from "undici";
import type { AdapterCtx, ErpAdapter, RawRecord } from "./types.js";

function buildUrl(base: unknown, path: unknown): string | null {
  const b = String(base ?? "").replace(/\/+$/, "");
  const p = String(path ?? "").trim();
  if (!b || !p) return null;
  return p.startsWith("http") ? p : `${b}/${p.replace(/^\/+/, "")}`;
}

async function fetchArray(url: string, config: Record<string, unknown>): Promise<RawRecord[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.token) headers.Authorization = `Bearer ${String(config.token)}`;
  const dispatcher = config.rejectUnauthorized ? undefined : new Agent({ connect: { rejectUnauthorized: false } });
  const res = await fetch(url, { headers, ...(dispatcher ? { dispatcher } : {}) });
  const data = await res.json();
  // Acepta un array directo o {data:[...]} / {items:[...]} / {results:[...]}.
  if (Array.isArray(data)) return data as RawRecord[];
  const d = data as Record<string, unknown>;
  const arr = (d.data ?? d.items ?? d.results) as unknown;
  return Array.isArray(arr) ? (arr as RawRecord[]) : [];
}

export const restAdapter: ErpAdapter = {
  key: "rest",
  label: "REST genérico (JSON)",

  async importProducts(ctx: AdapterCtx): Promise<RawRecord[]> {
    const url = buildUrl(ctx.config.baseUrl, ctx.config.productsPath);
    if (!url) throw new Error("Configurá baseUrl + productsPath");
    return fetchArray(url, ctx.config);
  },

  async importCategories(ctx: AdapterCtx): Promise<RawRecord[]> {
    const url = buildUrl(ctx.config.baseUrl, ctx.config.categoriesPath);
    if (!url) throw new Error("Configurá baseUrl + categoriesPath");
    return fetchArray(url, ctx.config);
  },
};
