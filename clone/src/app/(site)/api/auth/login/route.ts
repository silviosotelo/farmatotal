import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const AT_COOKIE = "ft_at";

/** Maps the backend session user ({id,email,name,role}) to the storefront User shape. */
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

// Proxy de sesión → POST :4000/auth/login (whitelisted en el backend).
// Reenvía la cookie entrante al backend y los Set-Cookie del backend (ft_rt) al browser.
// El backend devuelve el accessToken en el body (no como cookie): lo guardamos en una
// cookie httpOnly propia (ft_at) para que /api/auth/me pueda mandarlo como Bearer.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con el servidor" }, { status: 502 });
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message ?? "Credenciales inválidas" },
      { status: res.status },
    );
  }

  const out = NextResponse.json(mapUser(data.user));
  // Reenvía los Set-Cookie del backend (refresh token ft_rt) al browser.
  for (const c of res.headers.getSetCookie()) out.headers.append("set-cookie", c);
  // Guarda el access token en una cookie httpOnly propia para /api/auth/me.
  if (data.accessToken) {
    out.cookies.set(AT_COOKIE, data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1h
    });
  }
  return out;
}
