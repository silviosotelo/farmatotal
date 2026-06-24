/**
 * Estado de activación de módulos por tenant (la "activación de plugins" estilo WP).
 * Fuente: settings.modules_state = { [moduleKey]: boolean }. Nativos siempre activos;
 * plugins por defecto activos salvo que se apaguen (o su enabledByDefault).
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { MODULES } from "./registry.js";

const STATE_KEY = "modules_state";

export async function getModulesState(tenantId: string): Promise<Record<string, boolean>> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, STATE_KEY)))
    .limit(1);
  return (row?.value as Record<string, boolean>) ?? {};
}

/** ¿Está activo este módulo para el tenant? Nativos: siempre. Plugins: estado o default. */
export async function isModuleEnabled(tenantId: string, key: string): Promise<boolean> {
  const mod = MODULES.find((m) => m.key === key);
  if (!mod) return false;
  if (mod.kind === "native") return true;
  const state = await getModulesState(tenantId);
  return state[key] ?? mod.enabledByDefault ?? true;
}

/** Activa/desactiva un módulo plugin para el tenant (fuente única: modules_state). */
export async function setModuleEnabled(tenantId: string, key: string, enabled: boolean): Promise<void> {
  const state = await getModulesState(tenantId);
  state[key] = enabled;
  await db
    .insert(settings)
    .values({ tenantId, key: STATE_KEY, value: state })
    .onConflictDoUpdate({ target: [settings.tenantId, settings.key], set: { value: state, updatedAt: new Date() } });
}
