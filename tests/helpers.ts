import { crearEjemplo } from "./ejemplo";
import type { Destino, Ingreso, Item, Presupuesto, Seccion } from "@/lib/types";

let n = 0;
const id = () => `t-${++n}`;

export const item = (monto: number, extra: Partial<Item> = {}): Item => ({
  id: id(), nombre: `ítem ${n}`, monto, pagado: false, ...extra,
});

export const seccion = (extra: Partial<Seccion> = {}): Seccion => ({
  id: id(), nombre: "Sección", emoji: "📌", items: [], subsecciones: [], ...extra,
});

export const ingreso = (monto: number, extra: Partial<Ingreso> = {}): Ingreso => ({
  id: id(), nombre: "Ingreso", persona: "yo", fecha: "2026-12-20", monto, ...extra,
});

export const destino = (
  costos: Partial<Pick<Destino, "transporte" | "estadia" | "comidas" | "otros">> = {},
  extra: Partial<Destino> = {},
): Destino => ({
  id: id(), nombre: "Destino", notas: "", seleccionado: false,
  transporte: 0, estadia: 0, comidas: 0, otros: 0, ...costos, ...extra,
});

export const presupuesto = (extra: Partial<Presupuesto> = {}): Presupuesto => ({
  rev: 0, ingresos: [], secciones: [], destinos: [], ...extra,
});

export const seed = () => crearEjemplo();
