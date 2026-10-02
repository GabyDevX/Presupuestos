import { randomUUID } from "crypto";
import { totales } from "./calc";
import { crearEnBlanco, duplicarComoPlantilla } from "./plantilla";
import { crearSeed, NOMBRE_INICIAL } from "./seed";
import { borrarDoc, guardarDoc, guardarIds, leerDoc, leerIds, leerLegacy } from "./store";
import type { Presupuesto } from "./types";
import { resolverGuardado } from "./versiones";

export const ID_INICIAL = "inicial";
export const esIdValido = (id: string) => /^[A-Za-z0-9_-]{1,40}$/.test(id);

export interface ItemLista {
  id: string;
  nombre: string;
  archivado: boolean;
  creado?: string;
  ingresos: number;
  planificado: number;
  balance: number;
}

const normalizar = (d: Presupuesto): Presupuesto => ({ ...d, nombre: d.nombre ?? "Presupuesto" });

/** Primera vez: usa los datos de la versión anterior si existen; si no, los datos iniciales. */
async function migrar(): Promise<string[]> {
  const previo = await leerLegacy();
  const doc: Presupuesto = previo ? { ...previo, nombre: previo.nombre ?? NOMBRE_INICIAL } : crearSeed();
  await guardarDoc(ID_INICIAL, doc);
  await guardarIds([ID_INICIAL]);
  return [ID_INICIAL];
}

async function ids(): Promise<string[]> {
  return (await leerIds()) ?? (await migrar());
}

export async function listar(): Promise<ItemLista[]> {
  const lista = await ids();
  const docs = await Promise.all(lista.map(async (id) => [id, await leerDoc(id)] as const));
  return docs.flatMap(([id, d]) => {
    if (!d) return [];
    const doc = normalizar(d);
    const t = totales(doc);
    return [
      {
        id,
        nombre: doc.nombre,
        archivado: !!doc.archivado,
        creado: doc.creado,
        ingresos: t.ingresos,
        planificado: t.planificado,
        balance: t.balance,
      },
    ];
  });
}

export async function obtener(id: string): Promise<Presupuesto | null> {
  await ids();
  const d = await leerDoc(id);
  return d ? normalizar(d) : null;
}

export type Origen = { tipo: "blanco" } | { tipo: "duplicar"; id: string };

/** Crea un presupuesto nuevo. Devuelve null si el presupuesto a duplicar no existe. */
export async function crear(nombre: string, origen: Origen, ahora = new Date().toISOString()) {
  const lista = await ids();
  let doc: Presupuesto;
  if (origen.tipo === "duplicar") {
    const base = await obtener(origen.id);
    if (!base) return null;
    doc = duplicarComoPlantilla(base, nombre, ahora);
  } else {
    doc = crearEnBlanco(nombre, ahora);
  }
  const id = randomUUID().slice(0, 8);
  await guardarDoc(id, doc);
  await guardarIds([...lista, id]);
  return { id, doc };
}

export type ResultadoGuardar =
  | { tipo: "ok"; rev: number }
  | { tipo: "conflicto"; actual: Presupuesto }
  | { tipo: "noexiste" };

export async function guardarVersion(id: string, nuevo: Presupuesto): Promise<ResultadoGuardar> {
  const actual = await obtener(id);
  if (!actual) return { tipo: "noexiste" };
  const r = resolverGuardado(actual, nuevo);
  if (!r.ok) return { tipo: "conflicto", actual: r.actual };
  await guardarDoc(id, r.guardado);
  return { tipo: "ok", rev: r.guardado.rev };
}

export async function eliminar(id: string): Promise<boolean> {
  const lista = await ids();
  if (!lista.includes(id)) return false;
  await guardarIds(lista.filter((x) => x !== id));
  await borrarDoc(id);
  return true;
}
