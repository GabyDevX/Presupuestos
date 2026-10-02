import { afterEach, describe, expect, it, vi } from "vitest";
import { formatoFecha } from "@/lib/fechas";
import { parseRuta, rutaAHash, TABS } from "@/lib/ruta";
import { esTema, usaOscuro } from "@/lib/tema";

describe("rutas", () => {
  it("cada pestaña se convierte en hash y vuelve igual", () => {
    for (const tab of TABS) expect(parseRuta(rutaAHash({ tab }))).toEqual({ tab });
  });
  it("Resumen es '#/'", () => {
    expect(rutaAHash({ tab: "resumen" })).toBe("#/");
  });
  it("una sección de gastos incluye su id", () => {
    expect(rutaAHash({ tab: "gastos", seccionId: "abc" })).toBe("#/gastos/abc");
    expect(parseRuta("#/gastos/abc")).toEqual({ tab: "gastos", seccionId: "abc" });
  });
  it("los ids con caracteres raros se codifican y decodifican", () => {
    const id = "a b/ñ?";
    expect(parseRuta(rutaAHash({ tab: "gastos", seccionId: id })).seccionId).toBe(id);
  });
  it("hash vacío, desconocido o roto cae en Resumen", () => {
    for (const h of ["", "#", "#/", "#/nada", "abc"]) expect(parseRuta(h)).toEqual({ tab: "resumen" });
  });
  it("un id mal codificado abre la lista de Gastos sin lanzar error", () => {
    expect(parseRuta("#/gastos/%E0%A4%A")).toEqual({ tab: "gastos" });
  });
  it("solo Gastos admite id; en otras pestañas se ignora", () => {
    expect(parseRuta("#/ingresos/xyz")).toEqual({ tab: "ingresos" });
    expect(rutaAHash({ tab: "ingresos", seccionId: "x" })).toBe("#/ingresos");
  });
  it("acepta el hash sin barra inicial", () => {
    expect(parseRuta("#ajustes")).toEqual({ tab: "ajustes" });
  });
});

describe("fechas", () => {
  it("formatea día y mes corto en español", () => {
    expect(formatoFecha("2026-12-15")).toBe("15 dic");
    expect(formatoFecha("2027-01-04")).toBe("4 ene");
    expect(formatoFecha("2027-02-01")).toBe("1 feb");
  });
  it("sin fecha o inválida → 'Sin fecha'", () => {
    for (const f of ["", "15/12/2026", "2026-13-01", "2026-02-30", "x"]) expect(formatoFecha(f)).toBe("Sin fecha");
  });
  it("no depende de la zona horaria (usa fecha local, no UTC)", () => {
    expect(formatoFecha("2026-12-31")).toBe("31 dic");
    expect(formatoFecha("2027-01-01")).toBe("1 ene");
  });
});

describe("tema", () => {
  it("oscuro es el valor por defecto", () => {
    expect(usaOscuro(undefined, false)).toBe(true);
    expect(usaOscuro("basura", false)).toBe(true);
    expect(usaOscuro("oscuro", false)).toBe(true);
  });
  it("claro nunca usa oscuro", () => {
    expect(usaOscuro("claro", true)).toBe(false);
  });
  it("sistema sigue la preferencia del dispositivo", () => {
    expect(usaOscuro("sistema", true)).toBe(true);
    expect(usaOscuro("sistema", false)).toBe(false);
  });
  it("esTema valida los tres valores", () => {
    expect(["oscuro", "claro", "sistema"].every(esTema)).toBe(true);
    expect(esTema("rojo")).toBe(false);
    expect(esTema(null)).toBe(false);
  });
});

afterEach(() => vi.restoreAllMocks());
