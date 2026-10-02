export type Tab = "resumen" | "gastos" | "ingresos" | "ajustes";

export interface Ruta {
  tab: Tab;
  /** Id de la sección abierta (solo en Gastos). */
  seccionId?: string;
}

export const TABS: Tab[] = ["resumen", "gastos", "ingresos", "ajustes"];

/**
 * "#/gastos/abc" → { tab: "gastos", seccionId: "abc" }. Cualquier otra cosa → Resumen.
 * Con `base` (ej. "#/p/xyz") se interpreta lo que viene después de esa base.
 */
export function parseRuta(hash: string, base = ""): Ruta {
  let h = hash;
  if (base) {
    if (hash !== base && !hash.startsWith(base + "/")) return { tab: "resumen" };
    h = hash.slice(base.length);
  }
  const [tab, id] = h.replace(/^#?\/?/, "").split("/");
  if (!TABS.includes(tab as Tab)) return { tab: "resumen" };
  if (tab === "gastos" && id) {
    try {
      return { tab, seccionId: decodeURIComponent(id) };
    } catch {
      return { tab }; // link mal escrito (ej. "%E0%A4%A"): abrir la lista en vez de romper la app
    }
  }
  return { tab: tab as Tab };
}

export function rutaAHash(r: Ruta, base = ""): string {
  if (r.tab === "resumen") return base || "#/";
  const pref = base || "#";
  if (r.tab === "gastos" && r.seccionId) return `${pref}/gastos/${encodeURIComponent(r.seccionId)}`;
  return `${pref}/${r.tab}`;
}

/** Id del presupuesto abierto según el hash ("#/p/abc/gastos" → "abc"), o null en la lista. */
export function presupuestoDeHash(hash: string): string | null {
  const m = /^#\/p\/([A-Za-z0-9_-]{1,40})(?:\/|$)/.exec(hash);
  return m ? m[1] : null;
}

export const hashPresupuesto = (id: string) => `#/p/${id}`;
