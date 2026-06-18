import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const AT_COOKIE = "ft_at";

// POST :4000/auth/logout — reenvía la cookie entrante (ft_rt) para que el backend
// revoque el refresh token, reenvía su Set-Cookie (clearCookie ft_rt) al browser
// y además limpia nuestra cookie de access token (ft_at).
export async function POST(req: NextRequest) {
  let res: Response | null = null;
  try {
    res = await fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
  } catch {
    // si el backend no responde igual limpiamos la sesión local
  }

  const out = NextResponse.json({ ok: true });
  if (res) for (const c of res.headers.getSetCookie()) out.headers.append("set-cookie", c);
  out.cookies.set(AT_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return out;
}
