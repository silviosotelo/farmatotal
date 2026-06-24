#!/usr/bin/env tsx
/**
 * Seed de settings por tenant. No trae valores hardcodeados de ninguna marca.
 * Usá el admin (/app/concepts/store-config) para configurar nombre, colores, etc.
 *
 * Este script solo sirve si necesitás inicializar settings programáticamente
 * en un entorno nuevo (ej. CI, onboarding de un nuevo tenant).
 *
 * Uso: pnpm exec tsx src/scripts/seed-settings.ts
 */
import { db, pool } from "../db/client";
import { settings, tenants } from "../db/schema";

// Agregá acá solo settings de infraestructura que no dependan de la marca.
// Los datos de marca (nombre, colores, logo) van desde el admin, no desde acá.
const DEFAULTS: Array<{ key: string; value: unknown }> = [];

async function main() {
  if (DEFAULTS.length === 0) {
    console.log("No hay defaults definidos. Configurá la tienda desde el admin.");
    await pool.end();
    return;
  }

  const allTenants = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants);
  console.log(`Tenants: ${allTenants.map((t) => t.slug).join(", ")}`);

  for (const tenant of allTenants) {
    for (const { key, value } of DEFAULTS) {
      await db
        .insert(settings)
        .values({ tenantId: tenant.id, key, value })
        .onConflictDoNothing();
      console.log(`  [${tenant.slug}] ${key} → OK`);
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
