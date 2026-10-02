import { nuevoId } from "./calc";
import type { Presupuesto } from "./types";

/** "2026-12-15" → "2027-12-15". El 29 de febrero pasa al 28. Si no es una fecha válida, queda igual. */
export function sumarAnio(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, a, mes, dia] = m;
  const año = Number(a) + 1;
  const d = mes === "02" && dia === "29" ? "28" : dia;
  return `${año}-${mes}-${d}`;
}

const NOMBRE_POR_DEFECTO = "Nuevo presupuesto";
const limpiarNombre = (n: string) => n.trim().slice(0, 120) || NOMBRE_POR_DEFECTO;

/**
 * Copia la estructura de un presupuesto para empezar otro: mismas categorías, ítems y personas,
 * con los montos en 0, nada pagado y las fechas de ingresos corridas un año. No copia destinos
 * ni datos de ejemplo.
 */
export function duplicarComoPlantilla(origen: Presupuesto, nombre: string, ahora: string): Presupuesto {
  const copia = structuredClone(origen);
  const sinMonto = <T extends { monto: number; pagado: boolean; manual?: boolean }>(i: T): T => ({
    ...i,
    monto: 0,
    pagado: false,
    ...(i.manual !== undefined ? { manual: false } : {}),
  });
  return {
    nombre: limpiarNombre(nombre),
    creado: ahora,
    rev: 0,
    ingresos: copia.ingresos
      .filter((i) => !i.ejemplo)
      .map((i) => ({ ...i, monto: 0, fecha: sumarAnio(i.fecha) })),
    secciones: copia.secciones.map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.ejemplo).map(sinMonto),
      subsecciones: s.subsecciones.map((sub) => ({
        ...sub,
        omitida: sub.omitida ? false : sub.omitida,
        ...(sub.montoBase !== undefined ? { montoBase: 0 } : {}),
        items: sub.items.filter((i) => !i.ejemplo).map(sinMonto),
      })),
    })),
    destinos: [],
  };
}

/** Presupuesto vacío con una sola sección para empezar de cero. */
export function crearEnBlanco(nombre: string, ahora: string): Presupuesto {
  return {
    nombre: limpiarNombre(nombre),
    creado: ahora,
    rev: 0,
    ingresos: [],
    secciones: [{ id: nuevoId(), nombre: "Gastos", emoji: "📌", items: [], subsecciones: [] }],
    destinos: [],
  };
}
