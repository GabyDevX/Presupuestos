import type { Item, Presupuesto } from "./types";

let n = 0;
const id = () => `seed-${++n}`;

const item = (nombre: string, monto = 0, extra: Partial<Item> = {}): Item => ({
  id: id(),
  nombre,
  monto,
  pagado: false,
  ...extra,
});

// Los elementos con `ejemplo: true` son ficticios y se borran con un botón en la app.
const ej = (nombre: string, monto: number, pagado = false): Item =>
  item(`${nombre} (ejemplo)`, monto, { ejemplo: true, pagado });

export function crearSeed(): Presupuesto {
  n = 0;
  return {
    rev: 0,
    ingresos: [
      { id: id(), nombre: "Aguinaldo (ejemplo)", persona: "yo", fecha: "2026-12-20", monto: 60000, ejemplo: true },
      { id: id(), nombre: "Aguinaldo (ejemplo)", persona: "esposa", fecha: "2026-12-20", monto: 45000, ejemplo: true },
      { id: id(), nombre: "Salario vacacional (ejemplo)", persona: "yo", fecha: "2026-12-28", monto: 30000, ejemplo: true },
      { id: id(), nombre: "Salario vacacional (ejemplo)", persona: "esposa", fecha: "2027-01-05", monto: 25000, ejemplo: true },
    ],
    secciones: [
      {
        id: id(), nombre: "Auto", emoji: "🚗", items: [item("Patente", 0, { fijo: true })], subsecciones: [],
      },
      {
        id: id(), nombre: "Casa", emoji: "🏠",
        items: [item("Seguro de la casa (aseguradora) — se paga cerca de febrero, queda reservado", 0, { fijo: true })],
        subsecciones: [],
      },
      {
        id: id(), nombre: "Navidad", emoji: "🎄", items: [],
        subsecciones: [
          { id: id(), nombre: "Regalos", items: [ej("Regalo para la abuela", 2500), ej("Regalo para los primos", 3000)] },
          { id: id(), nombre: "Costo del viaje", items: [] },
          { id: id(), nombre: "Comida / preparación", items: [ej("Carne y verduras", 6000)] },
          { id: id(), nombre: "Decoración y cosas para la casa", items: [ej("Luces del arbolito", 1200, true)] },
        ],
      },
      {
        id: id(), nombre: "Fin de año", emoji: "🎆", items: [],
        subsecciones: [
          { id: id(), nombre: "Viaje", items: [], omitirTexto: "Nos quedamos en casa (no cuenta en el presupuesto)" },
          { id: id(), nombre: "Cosas para la casa", items: [] },
          { id: id(), nombre: "Comida", items: [ej("Cena de Año Nuevo", 8000)] },
          { id: id(), nombre: "Gastos extra", items: [ej("Cotillón", 1500)] },
        ],
      },
      {
        id: id(), nombre: "Cumpleaños", emoji: "🎂", items: [],
        subsecciones: [
          { id: id(), nombre: "Hijo 1", items: [ej("Regalo", 3500), ej("Torta y piñata", 4000)] },
          { id: id(), nombre: "Hijo 2", items: [ej("Regalo", 3000)] },
        ],
      },
      { id: id(), nombre: "Vacaciones (enero)", emoji: "🏖️", tipo: "vacaciones", items: [], subsecciones: [] },
    ],
    destinos: [
      { id: id(), nombre: "Playa cercana (ejemplo)", notas: "Ejemplo ficticio: 5 días, alquiler de cabaña. Link: https://ejemplo.com", seleccionado: true, transporte: 4000, estadia: 25000, comidas: 12000, otros: 3000, ejemplo: true },
      { id: id(), nombre: "Casa de familiares en el interior (ejemplo)", notas: "Ejemplo ficticio: una semana, sin pagar alojamiento.", seleccionado: false, transporte: 6000, estadia: 0, comidas: 8000, otros: 2000, ejemplo: true },
    ],
  };
}

export function esPresupuestoValido(x: unknown): x is Presupuesto {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.rev === "number" &&
    Array.isArray(p.ingresos) &&
    Array.isArray(p.secciones) &&
    Array.isArray(p.destinos)
  );
}
