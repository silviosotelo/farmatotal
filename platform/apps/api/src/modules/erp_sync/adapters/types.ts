/**
 * Sincronizador ERP AGNÓSTICO — interfaz de adapter.
 *
 * Cada ERP (Farmatotal, WooCommerce, otro) implementa esta interfaz. El motor
 * (jobs + mapper) es agnóstico: lee registros crudos del adapter, los transforma
 * con el mapeo configurable (erp_field_mappings) y los upserta de forma idempotente.
 *
 * Todos los métodos son OPCIONALES: un adapter puede soportar solo algunas
 * capacidades (ej. uno solo importa productos; otro solo empuja pedidos).
 */

/** Registro crudo del ERP (clave→valor sin transformar). */
export type RawRecord = Record<string, unknown>;

/** Contexto que recibe cada operación del adapter. */
export type AdapterCtx = {
  tenantId: string;
  /** Config del plugin (settings plugin_erp_sync): baseUrl, token, etc. */
  config: Record<string, unknown>;
};

/** Datos mínimos de una orden para el push al ERP. */
export type OrderPushInput = {
  order: Record<string, unknown>;
  lines: Record<string, unknown>[];
  branch?: Record<string, unknown> | null;
};

export interface ErpAdapter {
  /** Clave única del adapter (coincide con el valor del select `adapter` en la config). */
  key: string;
  /** Nombre legible para el admin. */
  label: string;
  /** Importa productos del ERP como registros crudos (se mapean luego). */
  importProducts?(ctx: AdapterCtx): Promise<RawRecord[]>;
  /** Importa categorías del ERP como registros crudos. */
  importCategories?(ctx: AdapterCtx): Promise<RawRecord[]>;
  /** Empuja una orden confirmada al ERP. */
  pushOrder?(input: OrderPushInput, ctx: AdapterCtx): Promise<void>;
  /** Consulta stock en vivo por SKU para una sucursal (erpCode). */
  fetchStock?(skus: string[], branchErpCode: string | null, ctx: AdapterCtx): Promise<Record<string, number>>;
}

/** Registro central de adapters disponibles (se llena en index.ts del módulo). */
const REGISTRY = new Map<string, ErpAdapter>();

export function registerAdapter(adapter: ErpAdapter) {
  REGISTRY.set(adapter.key, adapter);
}

export function getAdapter(key: string): ErpAdapter | undefined {
  return REGISTRY.get(key);
}

export function listAdapters(): { key: string; label: string }[] {
  return [...REGISTRY.values()].map((a) => ({ key: a.key, label: a.label }));
}
