export type Persona = "yo" | "esposa";

/** Nombres que se muestran en la app para cada persona. */
export const NOMBRES_PERSONA: Record<Persona, string> = { yo: "Gabriel", esposa: "Camila" };

export interface Ingreso {
  id: string;
  nombre: string;
  persona: Persona;
  fecha: string; // YYYY-MM-DD
  monto: number;
  ejemplo?: boolean;
}

export interface Item {
  id: string;
  nombre: string;
  monto: number;
  pagado: boolean;
  /** En una lista con presupuesto general: true si el monto se editó a mano (ya no sigue al general). */
  manual?: boolean;
  fijo?: boolean; // ítem predefinido: se puede editar pero no eliminar
  ejemplo?: boolean;
}

export interface Subseccion {
  id: string;
  nombre: string;
  items: Item[];
  /** Presupuesto general por ítem (ej. por persona en la lista de regalos). Los ítems no manuales lo siguen. */
  montoBase?: number;
  /** Texto del botón para agregar ítems (ej. "persona"). */
  etiquetaItem?: string;
  omitirTexto?: string; // si existe, se muestra un check para "no aplica" (ej. nos quedamos en casa)
  omitida?: boolean;
}

export interface Seccion {
  id: string;
  nombre: string;
  emoji: string;
  nota?: string;
  tipo?: "vacaciones"; // las opciones de destino seleccionadas se suman a esta sección
  items: Item[];
  subsecciones: Subseccion[];
}

export interface Destino {
  id: string;
  nombre: string;
  notas: string;
  seleccionado: boolean;
  transporte: number;
  estadia: number;
  comidas: number;
  otros: number;
  ejemplo?: boolean;
}

export interface Presupuesto {
  rev: number; // se incrementa en cada guardado; evita pisar cambios de la otra persona
  ingresos: Ingreso[];
  secciones: Seccion[];
  destinos: Destino[];
}
