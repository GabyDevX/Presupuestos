import type { Item, Presupuesto } from "./types";

const itemsDe = (p: Presupuesto): Item[] =>
  p.secciones.flatMap((s) => [...s.items, ...s.subsecciones.flatMap((x) => x.items)]);

export const hayEjemplos = (p: Presupuesto) =>
  p.ingresos.some((i) => i.ejemplo) ||
  p.destinos.some((d) => d.ejemplo) ||
  itemsDe(p).some((i) => i.ejemplo);

/** Quita todo lo marcado como ejemplo y conserva la estructura y los datos propios. Muta `p`. */
export function borrarEjemplos(p: Presupuesto) {
  p.ingresos = p.ingresos.filter((i) => !i.ejemplo);
  p.destinos = p.destinos.filter((d) => !d.ejemplo);
  for (const s of p.secciones) {
    s.items = s.items.filter((i) => !i.ejemplo);
    for (const sub of s.subsecciones) sub.items = sub.items.filter((i) => !i.ejemplo);
  }
}

/** Mueve el elemento `i` una posición (-1 arriba, +1 abajo). Muta `arr`; no hace nada en los bordes. */
export function mover<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (i < 0 || i >= arr.length || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
