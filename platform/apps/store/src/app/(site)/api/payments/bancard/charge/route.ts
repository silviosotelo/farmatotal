import { type NextRequest, NextResponse } from "next/server"
const API = process.env.API_URL || "http://api:4000"
export async function POST(req: NextRequest) {
  const body = await req.json()
  const r = await fetch(`${API}/payments/bancard/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant": process.env.STORE_TENANT || "default" },
    body: JSON.stringify(body),
  })
  return NextResponse.json(await r.json(), { status: r.status })
}
