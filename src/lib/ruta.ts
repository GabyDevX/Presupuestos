export type Tab = "resumen" | "gastos" | "ingresos" | "ajustes";

export interface Ruta {
  tab: Tab;
  /** Id de la sección abierta (solo en Gastos). */
  seccionId?: string;
}

export const TABS: Tab[] = ["resumen", "gastos", "ingresos", "ajustes"];

/** "#/gastos/abc" → { tab: "gastos", seccionId: "abc" }. Cualquier otra cosa → Resumen. */
export function parseRuta(hash: string): Ruta {
  const [tab, id] = hash.replace(/^#\/?/, "").split("/");
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

export function rutaAHash(r: Ruta): string {
  if (r.tab === "resumen") return "#/";
  if (r.tab === "gastos" && r.seccionId) return `#/gastos/${encodeURIComponent(r.seccionId)}`;
  return `#/${r.tab}`;
}
