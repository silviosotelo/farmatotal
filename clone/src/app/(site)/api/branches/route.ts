import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const branches = await db.branch.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(branches);
}
