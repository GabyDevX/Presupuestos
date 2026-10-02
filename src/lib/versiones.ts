import type { Presupuesto } from "./types";

export type ResultadoGuardado =
  | { ok: true; guardado: Presupuesto }
  | { ok: false; actual: Presupuesto };

/**
 * Control de versión optimista: solo se acepta un guardado hecho sobre la versión vigente.
 * Si la otra persona guardó antes, se devuelve su versión y no se pisa nada.
 */
export function resolverGuardado(actual: Presupuesto, nuevo: Presupuesto): ResultadoGuardado {
  if (nuevo.rev !== actual.rev) return { ok: false, actual };
  return { ok: true, guardado: { ...nuevo, rev: actual.rev + 1 } };
}
