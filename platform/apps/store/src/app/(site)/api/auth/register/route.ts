import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const AT_COOKIE = "ft_at";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().optional().default(""),
  phone: z.string().optional(),
});

function mapUser(u: { id: string; email: string; name?: string | null; role?: string }) {
  const name = (u.name ?? "").trim();
  const sp = name.indexOf(" ");
  return {
    id: u.id,
    email: u.email,
    firstName: sp === -1 ? name : name.slice(0, sp),
    lastName: sp === -1 ? "" : name.slice(sp + 1),
    role: u.role,
  };
}

// Registro real → POST :4000/auth/register (whitelisted). Crea credenciales y deja
// sesión iniciada igual que login: guarda el access token en cookie ft_at y reenvía
// el refresh (ft_rt) del backend.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, password, firstName, lastName } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();

  let res: Response;
  try {
    res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con el servidor" }, { status: 502 });
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ error: data?.message ?? "No se pudo crear la cuenta" }, { status: res.status });
  }

  const out = NextResponse.json(mapUser(data.user));
  for (const c of res.headers.getSetCookie()) out.headers.append("set-cookie", c);
  if (data.accessToken) {
    out.cookies.set(AT_COOKIE, data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
    });
  }
  return out;
}
