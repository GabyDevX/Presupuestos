import type { Destino, Ingreso, Item, Persona, Presupuesto, Seccion, Subseccion } from "./types";

/** Redondea a centavos para que sumas como 0,1 + 0,2 no dejen restos de punto flotante. */
export const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

/** Monto vigente de un ítem: el general de su lista, salvo que se haya editado a mano. */
export const montoItem = (i: Item, sub?: Pick<Subseccion, "montoBase">) =>
  sub?.montoBase !== undefined && !i.manual ? num(sub.montoBase) : num(i.monto);

type Linea = { monto: number; pagado: boolean };
const lineas = (items: Item[], sub?: Subseccion): Linea[] =>
  items.map((i) => ({ monto: montoItem(i, sub), pagado: i.pagado }));
const suma = (ls: Linea[]) => redondear(ls.reduce((t, l) => t + l.monto, 0));
const sumaPagada = (ls: Linea[]) =>
  redondear(ls.reduce((t, l) => t + (l.pagado ? l.monto : 0), 0));

export const totalSubseccion = (sub: Subseccion) => suma(lineas(sub.items, sub));

export const totalDestino = (d: Destino) =>
  redondear(num(d.transporte) + num(d.estadia) + num(d.comidas) + num(d.otros));

export const totalDestinosElegidos = (destinos: Destino[]) =>
  redondear(destinos.filter((d) => d.seleccionado).reduce((t, d) => t + totalDestino(d), 0));

/**
 * Totales de una sección. Las subsecciones marcadas como omitidas no cuentan.
 * Los destinos elegidos se suman (como pendientes) solo si `contarDestinos` es true;
 * por defecto, en las secciones de tipo vacaciones.
 */
export function totalesSeccion(
  s: Seccion,
  destinos: Destino[],
  contarDestinos: boolean = s.tipo === "vacaciones",
) {
  const itemsActivos = [
    ...lineas(s.items),
    ...s.subsecciones.filter((x) => !x.omitida).flatMap((x) => lineas(x.items, x)),
  ];
  const pagado = sumaPagada(itemsActivos);
  const planificado = redondear(
    suma(itemsActivos) + (contarDestinos ? totalDestinosElegidos(destinos) : 0),
  );
  return { planificado, pagado, pendiente: redondear(planificado - pagado) };
}

export function totales(p: Presupuesto) {
  const ingresos = redondear(p.ingresos.reduce((t, i) => t + num(i.monto), 0));
  let planificado = 0;
  let pagado = 0;
  // Los destinos se suman una sola vez, en la primera sección de vacaciones.
  let destinosContados = false;
  for (const s of p.secciones) {
    const cuenta = s.tipo === "vacaciones" && !destinosContados;
    if (cuenta) destinosContados = true;
    const t = totalesSeccion(s, p.destinos, cuenta);
    planificado += t.planificado;
    pagado += t.pagado;
  }
  planificado = redondear(planificado);
  pagado = redondear(pagado);
  const balance = redondear(ingresos - planificado);
  return {
    ingresos,
    planificado,
    pagado,
    pendiente: redondear(planificado - pagado),
    balance,
    /** Balance como si no hubiera ningún destino elegido: base para comparar escenarios. */
    balanceSinDestinos: redondear(
      balance + (destinosContados ? totalDestinosElegidos(p.destinos) : 0),
    ),
  };
}

/** Balance si el único destino elegido fuera `d`. */
export const balanceSoloDestino = (balanceSinDestinos: number, d: Destino) =>
  redondear(balanceSinDestinos - totalDestino(d));

export const totalPorPersona = (ingresos: Ingreso[], persona: Persona) =>
  redondear(ingresos.filter((i) => i.persona === persona).reduce((t, i) => t + num(i.monto), 0));

/** Ingresos ordenados por fecha (los que no tienen fecha, al final) con el acumulado. */
export function cronograma(ingresos: Ingreso[]) {
  const orden = ingresos
    .map((ingreso, pos) => ({ ingreso, pos }))
    .sort((a, b) => {
      const fa = a.ingreso.fecha || "9999-99-99";
      const fb = b.ingreso.fecha || "9999-99-99";
      return fa.localeCompare(fb) || a.pos - b.pos;
    });
  let acumulado = 0;
  return orden.map(({ ingreso }) => {
    acumulado = redondear(acumulado + num(ingreso.monto));
    return { ingreso, acumulado };
  });
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
