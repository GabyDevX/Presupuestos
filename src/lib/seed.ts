import type { Item, Presupuesto, Subseccion } from "./types";

let n = 0;
const id = () => `seed-${++n}`;

const item = (nombre: string, monto = 0, extra: Partial<Item> = {}): Item => ({
  id: id(),
  nombre,
  monto,
  pagado: false,
  ...extra,
});

const sub = (nombre: string, items: Item[] = [], extra: Partial<Subseccion> = {}): Subseccion => ({
  id: id(),
  nombre,
  items,
  ...extra,
});

// Personas de la lista de regalos de Navidad (el presupuesto general por persona se carga en la app).
const PERSONAS_REGALOS = [
  "Ronald", "Maryorie", "Pamela", "Rodolfo", "Sofia", "Joaquin", "Nene", "Alessander",
  "Mamaelo", "Papaelo", "Christopher", "Natalia", "Manuel", "Amelia", "Camila", "Gabriel",
];

/** Punto de partida con los datos reales. Todo lo pendiente de definir queda en 0. */
export function crearSeed(): Presupuesto {
  n = 0;
  return {
    rev: 0,
    ingresos: [
      { id: id(), nombre: "Aguinaldo", persona: "yo", fecha: "2026-12-15", monto: 60000 },
      { id: id(), nombre: "Aguinaldo", persona: "esposa", fecha: "2026-12-15", monto: 15000 },
      { id: id(), nombre: "Salario vacacional", persona: "yo", fecha: "2027-01-15", monto: 27000 },
      { id: id(), nombre: "Salario vacacional", persona: "esposa", fecha: "2027-01-15", monto: 9900 },
    ],
    secciones: [
      {
        id: id(), nombre: "Auto", emoji: "🚗", subsecciones: [],
        items: [item("Patente (se paga en enero)", 25500, { fijo: true })],
      },
      {
        id: id(), nombre: "Casa", emoji: "🏠", subsecciones: [],
        items: [item("Seguro de la casa (se paga en febrero, queda reservado)", 13000, { fijo: true })],
      },
      {
        id: id(), nombre: "Navidad", emoji: "🎄", items: [],
        subsecciones: [
          sub("Regalos", PERSONAS_REGALOS.map((p) => item(p)), { montoBase: 0, etiquetaItem: "persona" }),
          sub("Costo del viaje"),
          sub("Comida / preparación"),
          sub("Decoración y cosas para la casa"),
        ],
      },
      {
        id: id(), nombre: "Fin de año", emoji: "🎆", items: [],
        subsecciones: [
          sub("Viaje", [], { omitirTexto: "Nos quedamos en casa (no cuenta en el presupuesto)" }),
          sub("Cosas para la casa"),
          sub("Comida"),
          sub("Gastos extra"),
        ],
      },
      {
        id: id(), nombre: "Cumpleaños de enero", emoji: "🎂", items: [],
        subsecciones: [
          sub("Amelia — 4 de enero", [item("Regalo"), item("Torta"), item("Comida y bebida"), item("Decoración / cotillón")]),
          sub("Manuel — 6 de enero", [item("Regalo"), item("Torta"), item("Comida y bebida"), item("Decoración / cotillón")]),
          sub("Cumpleaños compartido — fecha por definir", [item("Lugar / salón"), item("Torta"), item("Comida y bebida"), item("Decoración / cotillón")]),
        ],
      },
      {
        id: id(), nombre: "Vacaciones (enero)", emoji: "🏖️", tipo: "vacaciones", items: [], subsecciones: [],
        nota: "Destino por definir. Vamos los 4: Gabriel, Camila, Amelia y Manuel.",
      },
    ],
    destinos: [],
  };
}
