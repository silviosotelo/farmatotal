import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    const all = await db.siteSetting.findMany();
    return NextResponse.json(Object.fromEntries(all.map((s) => [s.key, JSON.parse(s.value)])));
  }
  const setting = await db.siteSetting.findUnique({ where: { key } });
  if (!setting) return NextResponse.json(null);
  return NextResponse.json(JSON.parse(setting.value));
}
