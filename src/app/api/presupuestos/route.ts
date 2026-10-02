import { NextResponse } from "next/server";
import { estaAutenticado } from "@/lib/auth";
import { crear, listar, type Origen } from "@/lib/presupuestos";
import { esIdValido } from "@/lib/presupuestos";

export const dynamic = "force-dynamic";

const noAutorizado = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });

export async function GET() {
  if (!(await estaAutenticado())) return noAutorizado();
  return NextResponse.json({ items: await listar() });
}

export async function POST(req: Request) {
  if (!(await estaAutenticado())) return noAutorizado();
  const body = await req.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre : "";
  const desde = body?.desde;
  let origen: Origen = { tipo: "blanco" };
  if (desde && typeof desde === "object" && desde.tipo === "duplicar") {
    if (typeof desde.id !== "string" || !esIdValido(desde.id)) {
      return NextResponse.json({ error: "Id inválido" }, { status: 400 });
    }
    origen = { tipo: "duplicar", id: desde.id };
  } else if (desde && desde.tipo !== "blanco") {
    return NextResponse.json({ error: "Origen inválido" }, { status: 400 });
  }
  const creado = await crear(nombre, origen);
  if (!creado) return NextResponse.json({ error: "No existe el presupuesto a duplicar" }, { status: 404 });
  return NextResponse.json({ id: creado.id, data: creado.doc }, { status: 201 });
}
