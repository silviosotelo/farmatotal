import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(pages);
}

const createSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  blocks: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const page = await db.page.create({
      data: {
        slug: data.slug,
        title: data.title,
        blocks: data.blocks ?? "[]",
      },
    });
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
