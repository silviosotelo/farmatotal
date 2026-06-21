#!/usr/bin/env tsx
/**
 * Siembra sucursales reales de Farmatotal + cupones demo + inventario base.
 * Sucursales tomadas de farmatotal.com.py/sucursales (Asunción y Gran Asunción).
 */
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../db/client";
import { branches, coupons, inventory, products, tenants } from "../db/schema";

const SUCURSALES = [
  { code: "CASA-CENTRAL", name: "Casa Central - Eusebio Ayala", address: "Av. Eusebio Ayala c/ Tte. Zotti", city: "Asunción", phone: "021 555 000" },
  { code: "VILLA-MORRA", name: "Villa Morra", address: "Av. Mariscal López c/ San Roque González", city: "Asunción", phone: "021 600 100" },
  { code: "SAN-LORENZO", name: "San Lorenzo - Ruta Mcal. Estigarribia", address: "Ruta Mcal. Estigarribia km 12", city: "San Lorenzo", phone: "021 580 200" },
  { code: "LAMBARE", name: "Lambaré - Cacique Lambaré", address: "Av. Cacique Lambaré", city: "Lambaré", phone: "021 900 300" },
  { code: "LUQUE", name: "Luque - Centro", address: "Gral. Aquino c/ Cap. Brizuela", city: "Luque", phone: "021 645 400" },
  { code: "FERNANDO", name: "Fernando de la Mora", address: "Av. Rca. Argentina", city: "Fernando de la Mora", phone: "021 510 500" },
  { code: "CDE-CENTRO", name: "Ciudad del Este - Centro", address: "Av. Adrián Jara", city: "Ciudad del Este", phone: "061 500 600" },
  { code: "ENCARNACION", name: "Encarnación - Centro", address: "Av. Caballero c/ 25 de Mayo", city: "Encarnación", phone: "071 200 700" },
];

const CUPONES = [
  { code: "BIENVENIDO10", type: "percent" as const, value: 10, minSubtotal: 50000 },
  { code: "ENVIOGRATIS", type: "fixed" as const, value: 25000, minSubtotal: 200000 },
  { code: "FARMA15", type: "percent" as const, value: 15, minSubtotal: 100000 },
];

async function main() {
  const tenantSlug = process.env.DEFAULT_TENANT ?? "default";
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) throw new Error(`Tenant '${tenantSlug}' no existe`);
  const tenantId = tenant.id;

  console.log("[seed] sucursales…");
  const branchIds: string[] = [];
  for (const s of SUCURSALES) {
    const [row] = await db
      .insert(branches)
      .values({ ...s, tenantId, pickupEnabled: true, deliveryEnabled: s.city === "Asunción" })
      .onConflictDoUpdate({ target: branches.code, set: { name: s.name, address: s.address, updatedAt: new Date() } })
      .returning({ id: branches.id });
    if (row) branchIds.push(row.id);
  }
  console.log(`[seed] ${branchIds.length} sucursales`);

  console.log("[seed] cupones…");
  for (const c of CUPONES) {
    await db.insert(coupons).values({ ...c, tenantId }).onConflictDoUpdate({ target: coupons.code, set: { value: c.value, updatedAt: new Date() } });
  }
  console.log(`[seed] ${CUPONES.length} cupones`);

  // Inventario: distribuir stock pseudo-aleatorio determinístico por producto en 3 sucursales
  console.log("[seed] inventario base (primeros 1500 productos × 3 sucursales)…");
  const prods = await db.select({ id: products.id, sku: products.sku }).from(products).limit(1500);
  let invRows = 0;
  for (let i = 0; i < prods.length; i++) {
    const p = prods[i]!;
    // stock determinístico desde el sku (sin Math.random para reproducibilidad)
    const seed = [...p.sku].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const targets = [branchIds[0]!, branchIds[(i % 3) + 1]!, branchIds[(i % 4) + 4]!].filter(Boolean);
    let total = 0;
    for (let j = 0; j < targets.length; j++) {
      const stock = ((seed + j * 7) % 12); // 0..11
      total += stock;
      await db
        .insert(inventory)
        .values({ tenantId, productId: p.id, branchId: targets[j]!, stock })
        .onConflictDoUpdate({
          target: [inventory.productId, inventory.branchId],
          set: { stock, updatedAt: new Date() },
        });
      invRows++;
    }
    await db.update(products).set({ stockCached: total }).where(sql`${products.id} = ${p.id}`);
  }
  console.log(`[seed] ${invRows} filas de inventario`);
  await pool.end();
  console.log("[seed] DONE");
}

main().catch((e) => {
  console.error("[seed] FAIL", e);
  process.exit(1);
});
