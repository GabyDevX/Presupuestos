import { NextResponse } from "next/server";
import { estaAutenticado } from "@/lib/auth";
import { eliminar, esIdValido, guardarVersion, obtener } from "@/lib/presupuestos";
import { esPresupuestoValido } from "@/lib/validar";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

const noAutorizado = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });
const noExiste = () => NextResponse.json({ error: "No existe" }, { status: 404 });

export async function GET(_req: Request, { params }: Contexto) {
  if (!(await estaAutenticado())) return noAutorizado();
  const { id } = await params;
  if (!esIdValido(id)) return noExiste();
  const data = await obtener(id);
  return data ? NextResponse.json({ data }) : noExiste();
}

export async function PUT(req: Request, { params }: Contexto) {
  if (!(await estaAutenticado())) return noAutorizado();
  const { id } = await params;
  if (!esIdValido(id)) return noExiste();
  const texto = await req.text();
  if (texto.length > 1_000_000) {
    return NextResponse.json({ error: "Demasiado grande" }, { status: 413 });
  }
  let nuevo: unknown;
  try {
    nuevo = JSON.parse(texto);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!esPresupuestoValido(nuevo)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const r = await guardarVersion(id, nuevo);
  if (r.tipo === "noexiste") return noExiste();
  // Si la otra persona guardó antes, no pisamos sus cambios.
  if (r.tipo === "conflicto") return NextResponse.json({ error: "Conflicto", data: r.actual }, { status: 409 });
  return NextResponse.json({ rev: r.rev });
}

export async function DELETE(_req: Request, { params }: Contexto) {
  if (!(await estaAutenticado())) return noAutorizado();
  const { id } = await params;
  if (!esIdValido(id)) return noExiste();
  return (await eliminar(id)) ? NextResponse.json({ ok: true }) : noExiste();
}
