import type { Destino, Item, Presupuesto, Seccion } from "./types";

const suma = (items: Item[]) => items.reduce((t, i) => t + (i.monto || 0), 0);
const sumaPagada = (items: Item[]) =>
  items.reduce((t, i) => t + (i.pagado ? i.monto || 0 : 0), 0);

export const totalDestino = (d: Destino) =>
  (d.transporte || 0) + (d.estadia || 0) + (d.comidas || 0) + (d.otros || 0);

export const totalDestinosElegidos = (destinos: Destino[]) =>
  destinos.filter((d) => d.seleccionado).reduce((t, d) => t + totalDestino(d), 0);

export function totalesSeccion(s: Seccion, destinos: Destino[]) {
  const itemsActivos = [
    ...s.items,
    ...s.subsecciones.filter((x) => !x.omitida).flatMap((x) => x.items),
  ];
  let planificado = suma(itemsActivos);
  const pagado = sumaPagada(itemsActivos);
  if (s.tipo === "vacaciones") planificado += totalDestinosElegidos(destinos);
  return { planificado, pagado, pendiente: planificado - pagado };
}

export function totales(p: Presupuesto) {
  const ingresos = p.ingresos.reduce((t, i) => t + (i.monto || 0), 0);
  let planificado = 0;
  let pagado = 0;
  for (const s of p.secciones) {
    const t = totalesSeccion(s, p.destinos);
    planificado += t.planificado;
    pagado += t.pagado;
  }
  return {
    ingresos,
    planificado,
    pagado,
    pendiente: planificado - pagado,
    balance: ingresos - planificado,
  };
}

export const formatoMoneda = (n: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n);

export const nuevoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
