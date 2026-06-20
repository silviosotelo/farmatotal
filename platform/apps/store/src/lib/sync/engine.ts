/**
 * Sync Engine — ERP-agnostic data synchronization.
 *
 * Architecture (per SYNC-ENGINE.md):
 * 1. Connector: fetches raw data from ERP (REST, SQL, file, etc.)
 * 2. SourceSchema: normalizes raw data into a standard shape
 * 3. Mapping: transforms source fields → Prisma fields
 * 4. Run: upserts into DB with dry-run preview
 *
 * The engine is connector-agnostic. A connector just implements:
 *   fetchProducts() → RawRecord[]
 *   fetchCategories() → RawRecord[]
 *   fetchStock() → RawRecord[]
 */

import { db } from "@/lib/db";
import { slugify } from "@/lib/product";

export interface RawRecord {
  [key: string]: unknown;
}

export interface FieldMapping {
  source: string;       // field name in RawRecord
  target: string;       // field name in Prisma model
  transform?: string;   // "int", "bool", "upper", "lower", "slug", null (identity)
  args?: string;        // extra args for transform
}

export interface SyncResult {
  ok: boolean;
  type: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: string[];
  duration: number;
  dryRun: boolean;
  preview?: unknown[];
}

export interface Connector {
  name: string;
  fetchProducts(): Promise<RawRecord[]>;
  fetchCategories(): Promise<RawRecord[]>;
  fetchStock(): Promise<RawRecord[]>;
}

/**
 * Applies a transform function to a value.
 */
function applyTransform(value: unknown, transform?: string, _args?: string): unknown {
  if (value === null || value === undefined) return value;
  switch (transform) {
    case "int":
      return typeof value === "number" ? value : parseInt(String(value), 10) || 0;
    case "float":
      return typeof value === "number" ? value : parseFloat(String(value)) || 0;
    case "bool":
      return Boolean(value);
    case "upper":
      return String(value).toUpperCase();
    case "lower":
      return String(value).toLowerCase();
    case "trim":
      return String(value).trim();
    case "slug":
      return slugify(String(value));
    default:
      return value;
  }
}

/**
 * Maps a raw record to a Prisma-compatible object using field mappings.
 */
function mapRecord(record: RawRecord, mappings: FieldMapping[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const m of mappings) {
    const rawValue = record[m.source];
    result[m.target] = applyTransform(rawValue, m.transform, m.args);
  }
  return result;
}

/**
 * Runs a full or delta sync for products.
 */
export async function runProductSync(
  connector: Connector,
  mappings: FieldMapping[],
  options: { dryRun?: boolean; limit?: number } = {},
): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let itemsProcessed = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsSkipped = 0;
  const preview: unknown[] = [];

  try {
    const rawProducts = await connector.fetchProducts();
    const toProcess = options.limit ? rawProducts.slice(0, options.limit) : rawProducts;

    for (const raw of toProcess) {
      itemsProcessed++;
      try {
        const mapped = mapRecord(raw, mappings);

        // Skip if no SKU
        const sku = mapped.sku as string;
        if (!sku) {
          itemsSkipped++;
          errors.push(`Row ${itemsProcessed}: missing sku`);
          continue;
        }

        if (options.dryRun) {
          preview.push(mapped);
          continue;
        }

        // Determine price logic
        const priceNormal = (mapped.priceNormal as number) ?? 0;
        const onPromo = Boolean(mapped.onPromo);
        const priceWeb = onPromo ? ((mapped.priceWeb as number) ?? priceNormal) : priceNormal;

        // Upsert product
        const existing = await db.product.findUnique({ where: { sku } });
        if (existing) {
          await db.product.update({
            where: { sku },
            data: {
              title: (mapped.title as string) ?? existing.title,
              description: (mapped.description as string) ?? existing.description,
              brand: (mapped.brand as string) ?? existing.brand,
              priceNormal,
              priceWeb,
              onPromo,
              promoCode: (mapped.promoCode as string) ?? existing.promoCode,
              controlled: (mapped.controlled as boolean) ?? existing.controlled,
              featured: (mapped.featured as boolean) ?? existing.featured,
              stock: (mapped.stock as number) ?? existing.stock,
              syncedAt: new Date(),
            },
          });
          itemsUpdated++;
        } else {
          const title = (mapped.title as string) ?? sku;
          const slug = slugify(title);
          await db.product.create({
            data: {
              sku,
              slug,
              title,
              description: (mapped.description as string) ?? "",
              brand: (mapped.brand as string) ?? "",
              priceNormal,
              priceWeb,
              onPromo,
              promoCode: (mapped.promoCode as string),
              controlled: (mapped.controlled as boolean) ?? false,
              featured: (mapped.featured as boolean) ?? false,
              stock: (mapped.stock as number) ?? 0,
              published: true,
              erpSourced: true,
            },
          });
          itemsCreated++;
        }
      } catch (rowErr) {
        itemsSkipped++;
        errors.push(`Row ${itemsProcessed}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }

    // Log sync
    if (!options.dryRun) {
      await db.erpSyncLog.create({
        data: {
          type: "product_sync",
          ok: errors.length === 0,
          itemsCount: itemsProcessed,
          message: errors.length > 0 ? `${errors.length} errors` : null,
        },
      });
    }

    return {
      ok: errors.length === 0,
      type: "product_sync",
      itemsProcessed,
      itemsCreated,
      itemsUpdated,
      itemsSkipped,
      errors,
      duration: Date.now() - start,
      dryRun: options.dryRun ?? false,
      preview: options.dryRun ? preview : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.erpSyncLog.create({
      data: { type: "product_sync", ok: false, itemsCount: 0, message: msg },
    });
    return {
      ok: false,
      type: "product_sync",
      itemsProcessed,
      itemsCreated,
      itemsUpdated,
      itemsSkipped,
      errors: [msg],
      duration: Date.now() - start,
      dryRun: options.dryRun ?? false,
    };
  }
}

/**
 * Runs a stock sync — updates inventory quantities.
 */
export async function runStockSync(
  connector: Connector,
  mappings: FieldMapping[],
  options: { dryRun?: boolean } = {},
): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let itemsProcessed = 0;
  let itemsUpdated = 0;
  let itemsSkipped = 0;
  const preview: unknown[] = [];

  try {
    const rawStock = await connector.fetchStock();

    for (const raw of rawStock) {
      itemsProcessed++;
      try {
        const mapped = mapRecord(raw, mappings);
        const sku = mapped.sku as string;
        const branchErpId = mapped.branchId as string;
        const quantity = (mapped.quantity as number) ?? 0;

        if (!sku || !branchErpId) {
          itemsSkipped++;
          continue;
        }

        if (options.dryRun) {
          preview.push(mapped);
          continue;
        }

        const product = await db.product.findUnique({ where: { sku } });
        const branch = await db.branch.findUnique({ where: { erpId: branchErpId } });

        if (!product || !branch) {
          itemsSkipped++;
          continue;
        }

        await db.inventory.upsert({
          where: {
            productId_branchId: { productId: product.id, branchId: branch.id },
          },
          update: { quantity },
          create: { productId: product.id, branchId: branch.id, quantity },
        });

        // Update product total stock
        const totalStock = await db.inventory.aggregate({
          where: { productId: product.id },
          _sum: { quantity: true },
        });
        await db.product.update({
          where: { id: product.id },
          data: { stock: totalStock._sum.quantity ?? 0 },
        });

        itemsUpdated++;
      } catch (rowErr) {
        itemsSkipped++;
        errors.push(`Row ${itemsProcessed}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }

    if (!options.dryRun) {
      await db.erpSyncLog.create({
        data: {
          type: "stock_sync",
          ok: errors.length === 0,
          itemsCount: itemsProcessed,
          message: errors.length > 0 ? `${errors.length} errors` : null,
        },
      });
    }

    return {
      ok: errors.length === 0,
      type: "stock_sync",
      itemsProcessed,
      itemsCreated: 0,
      itemsUpdated,
      itemsSkipped,
      errors,
      duration: Date.now() - start,
      dryRun: options.dryRun ?? false,
      preview: options.dryRun ? preview : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      type: "stock_sync",
      itemsProcessed,
      itemsCreated: 0,
      itemsUpdated,
      itemsSkipped,
      errors: [msg],
      duration: Date.now() - start,
      dryRun: options.dryRun ?? false,
    };
  }
}
