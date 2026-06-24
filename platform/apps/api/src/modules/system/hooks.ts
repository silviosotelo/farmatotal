/**
 * Sistema de hooks estilo WordPress/WooCommerce (do_action / apply_filters).
 *
 * - Acciones (efectos): `registerAction(name, fn)` + `doAction(name, ctx)`.
 * - Filtros (transforman un valor): `registerFilter(name, fn)` + `applyFilters(name, value, ctx)`.
 *
 * Cada handler puede declarar el `module` al que pertenece: solo corre si ese módulo
 * está ACTIVO para el tenant (ctx.tenantId). Los handlers sin `module` corren siempre.
 * Orden por `priority` ascendente (menor corre primero), igual que WP.
 */
import { isModuleEnabled } from "./moduleState.js";

/** Todo hook recibe al menos el tenant para resolver activación y scope. */
export type HookCtx = { tenantId: string; [k: string]: unknown };

type ActionHandler = (ctx: HookCtx) => void | Promise<void>;
type FilterHandler<T = unknown> = (value: T, ctx: HookCtx) => T | Promise<T>;

type Entry<F> = { fn: F; priority: number; module?: string };

const actions = new Map<string, Entry<ActionHandler>[]>();
const filters = new Map<string, Entry<FilterHandler>[]>();

function insert<F>(map: Map<string, Entry<F>[]>, name: string, entry: Entry<F>) {
  const list = map.get(name) ?? [];
  list.push(entry);
  list.sort((a, b) => a.priority - b.priority);
  map.set(name, list);
}

export function registerAction(name: string, fn: ActionHandler, opts: { priority?: number; module?: string } = {}) {
  insert(actions, name, { fn, priority: opts.priority ?? 10, module: opts.module });
}

export function registerFilter<T = unknown>(name: string, fn: FilterHandler<T>, opts: { priority?: number; module?: string } = {}) {
  insert(filters, name, { fn: fn as FilterHandler, priority: opts.priority ?? 10, module: opts.module });
}

async function allowed(entry: { module?: string }, tenantId: string): Promise<boolean> {
  if (!entry.module) return true;
  try {
    return await isModuleEnabled(tenantId, entry.module);
  } catch {
    return false;
  }
}

/** Dispara una acción: corre cada handler activo en orden de prioridad. No lanza. */
export async function doAction(name: string, ctx: HookCtx): Promise<void> {
  const list = actions.get(name);
  if (!list?.length) return;
  for (const entry of list) {
    if (!(await allowed(entry, ctx.tenantId))) continue;
    try {
      await entry.fn(ctx);
    } catch {
      /* un handler que falla no rompe a los demás ni al flujo principal */
    }
  }
}

/** Aplica filtros encadenando el valor por cada handler activo. */
export async function applyFilters<T>(name: string, value: T, ctx: HookCtx): Promise<T> {
  const list = filters.get(name);
  if (!list?.length) return value;
  let acc = value;
  for (const entry of list) {
    if (!(await allowed(entry, ctx.tenantId))) continue;
    try {
      acc = (await entry.fn(acc, ctx)) as T;
    } catch {
      /* ignora el filtro que falla, mantiene el valor acumulado */
    }
  }
  return acc;
}

/** Para diagnóstico/admin: qué hooks tienen handlers registrados. */
export function listHooks() {
  const map = (m: Map<string, Entry<unknown>[]>) =>
    [...m.entries()].map(([name, l]) => ({ name, handlers: l.map((e) => ({ module: e.module ?? null, priority: e.priority })) }));
  return { actions: map(actions), filters: map(filters) };
}
