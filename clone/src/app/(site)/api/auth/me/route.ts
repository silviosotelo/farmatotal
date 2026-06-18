import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const AT_COOKIE = "ft_at";

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

// GET :4000/auth/me — el backend lee el access token del header Authorization (Bearer),
// no de cookie. Tomamos el token de la cookie httpOnly ft_at (o del Authorization entrante)
// y lo reenviamos como Bearer. Devuelve el User o null/401 si no hay sesión.
export async function GET(req: NextRequest) {
  const at = req.cookies.get(AT_COOKIE)?.value;
  const auth = req.headers.get("authorization") ?? (at ? `Bearer ${at}` : "");
  if (!auth) return NextResponse.json(null, { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${API}/auth/me`, {
      headers: { authorization: auth, cookie: req.headers.get("cookie") ?? "" },
    });
  } catch {
    return NextResponse.json(null, { status: 502 });
  }

  if (!res.ok) return NextResponse.json(null, { status: 401 });
  const data = await res.json().catch(() => null);
  if (!data?.user) return NextResponse.json(null, { status: 401 });
  return NextResponse.json(mapUser(data.user));
}
