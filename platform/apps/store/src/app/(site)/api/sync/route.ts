import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runProductSync, runStockSync } from "@/lib/sync/engine";
import type { FieldMapping } from "@/lib/sync/engine";
import { JsonConnector } from "@/lib/sync/connectors/json-connector";
import { z } from "zod";

const syncSchema = z.object({
  type: z.enum(["products", "stock", "categories"]),
  dryRun: z.boolean().optional().default(false),
  data: z.array(z.record(z.string(), z.unknown())),
  mappings: z.array(z.object({
    source: z.string(),
    target: z.string(),
    transform: z.string().optional(),
    args: z.string().optional(),
  })),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, dryRun, data, mappings } = syncSchema.parse(body);

    const connector = new JsonConnector();
    const fieldMappings: FieldMapping[] = mappings;

    if (type === "products") {
      connector.loadProducts(data);
      const result = await runProductSync(connector, fieldMappings, { dryRun });
      return NextResponse.json(result);
    }

    if (type === "stock") {
      connector.loadStock(data);
      const result = await runStockSync(connector, fieldMappings, { dryRun });
      return NextResponse.json(result);
    }

    if (type === "categories") {
      // Category sync: upsert by fliaCodigo or slug
      let created = 0;
      let updated = 0;
      const preview: unknown[] = [];

      for (const raw of data) {
        const mapped: Record<string, unknown> = {};
        for (const m of mappings) {
          mapped[m.target] = raw[m.source];
        }

        if (dryRun) {
          preview.push(mapped);
          continue;
        }

        const slug = (mapped.slug as string) ?? (mapped.name as string)?.toLowerCase().replace(/\s+/g, "-");
        if (!slug) continue;

        const existing = await db.category.findUnique({ where: { slug } });
        if (existing) {
          await db.category.update({
            where: { slug },
            data: {
              name: (mapped.name as string) ?? existing.name,
              fliaCodigo: (mapped.fliaCodigo as string) ?? existing.fliaCodigo,
              icon: (mapped.icon as string) ?? existing.icon,
            },
          });
          updated++;
        } else {
          await db.category.create({
            data: {
              slug,
              name: (mapped.name as string) ?? slug,
              fliaCodigo: (mapped.fliaCodigo as string),
              icon: (mapped.icon as string),
            },
          });
          created++;
        }
      }

      if (!dryRun) {
        await db.erpSyncLog.create({
          data: { type: "category_sync", ok: true, itemsCount: data.length },
        });
      }

      return NextResponse.json({
        ok: true,
        type: "category_sync",
        itemsProcessed: data.length,
        itemsCreated: created,
        itemsUpdated: updated,
        dryRun,
        preview: dryRun ? preview : undefined,
      });
    }

    return NextResponse.json({ error: "Tipo de sync no soportado" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  const logs = await db.erpSyncLog.findMany({
    orderBy: { ranAt: "desc" },
    take: 50,
  });
  return NextResponse.json(logs);
}
