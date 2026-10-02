import { NextResponse } from "next/server";
import { estaAutenticado } from "@/lib/auth";
import { crearSeed } from "@/lib/seed";
import { esPresupuestoValido } from "@/lib/validar";
import { resolverGuardado } from "@/lib/versiones";
import { guardar, leer } from "@/lib/store";

export const dynamic = "force-dynamic";

const noAutorizado = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });

export async function GET() {
  if (!(await estaAutenticado())) return noAutorizado();
  return NextResponse.json({ data: (await leer()) ?? crearSeed() });
}

export async function PUT(req: Request) {
  if (!(await estaAutenticado())) return noAutorizado();
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

  // Si la otra persona guardó antes, no pisamos sus cambios.
  const resultado = resolverGuardado((await leer()) ?? crearSeed(), nuevo);
  if (!resultado.ok) {
    return NextResponse.json({ error: "Conflicto", data: resultado.actual }, { status: 409 });
  }
  await guardar(resultado.guardado);
  return NextResponse.json({ rev: resultado.guardado.rev });
}
