#!/usr/bin/env tsx
/**
 * Carga las sucursales REALES de Farmatotal desde el Agile Store Locator.
 * Reemplaza las de prueba. Idempotente por code = asl_<id>.
 *
 * Uso: NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm exec tsx src/scripts/seed-branches-real.ts
 */
import { sql } from "drizzle-orm";
import { db, pool } from "../db/client";
import { branches } from "../db/schema";

const URL =
  "https://www.farmatotal.com.py/wp-admin/admin-ajax.php?action=asl_load_stores";

type AslStore = {
  id: string;
  title: string;
  street: string;
  city: string;
  state: string;
  lat: string;
  lng: string;
  phone: string;
  email: string;
  open_hours: string;
  slug: string;
};

function parseHours(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function main() {
  const res = await fetch(URL, {
    headers: { "User-Agent": "FarmatotalSeed/1.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`locator ${res.status}`);
  const stores = (await res.json()) as AslStore[];
  console.log(`[branches] ${stores.length} sucursales del locator`);

  // Borrar las de prueba (codes sin prefijo asl_)
  await db.delete(branches).where(sql`${branches.code} not like 'asl_%'`);
  console.log("[branches] sucursales de prueba eliminadas");

  let ok = 0;
  for (const s of stores) {
    const code = `asl_${s.id}`;
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lng);
    await db
      .insert(branches)
      .values({
        code,
        name: s.title,
        address: s.street || null,
        city: s.city || null,
        phone: s.phone || null,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        schedule: parseHours(s.open_hours) as never,
        pickupEnabled: true,
        deliveryEnabled: false,
        active: true,
      })
      .onConflictDoUpdate({
        target: branches.code,
        set: {
          name: s.title,
          address: s.street || null,
          city: s.city || null,
          phone: s.phone || null,
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          updatedAt: new Date(),
        },
      });
    ok++;
  }
  console.log(`[branches] ${ok} sucursales reales cargadas`);
  await pool.end();
}

main().catch((e) => {
  console.error("[branches] FAIL", e);
  process.exit(1);
});
