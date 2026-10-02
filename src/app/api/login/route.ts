import { NextResponse } from "next/server";
import { COOKIE, DURACION, passwordCorrecta, valorCookie } from "@/lib/auth";

export async function POST(req: Request) {
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json(
      { error: "Falta configurar APP_PASSWORD en el servidor." },
      { status: 500 },
    );
  }
  const body = await req.json().catch(() => null);
  const intento = typeof body?.password === "string" ? body.password : "";
  if (!passwordCorrecta(intento)) {
    await new Promise((r) => setTimeout(r, 800)); // frena la fuerza bruta
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, valorCookie()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION,
  });
  return res;
}
