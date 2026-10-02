import { afterEach, describe, expect, it, vi } from "vitest";
import { formatoFecha } from "@/lib/fechas";
import { hashPresupuesto, parseRuta, presupuestoDeHash, rutaAHash, TABS } from "@/lib/ruta";
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

describe("rutas con presupuesto (base)", () => {
  const base = "#/p/abc123";
  it("Resumen de un presupuesto es solo la base", () => {
    expect(rutaAHash({ tab: "resumen" }, base)).toBe(base);
    expect(parseRuta(base, base)).toEqual({ tab: "resumen" });
  });
  it("las pestañas y secciones van después de la base", () => {
    expect(rutaAHash({ tab: "ingresos" }, base)).toBe("#/p/abc123/ingresos");
    expect(rutaAHash({ tab: "gastos", seccionId: "s1" }, base)).toBe("#/p/abc123/gastos/s1");
    expect(parseRuta("#/p/abc123/gastos/s1", base)).toEqual({ tab: "gastos", seccionId: "s1" });
    expect(parseRuta("#/p/abc123/ajustes", base)).toEqual({ tab: "ajustes" });
  });
  it("ida y vuelta para todas las pestañas", () => {
    for (const tab of TABS) expect(parseRuta(rutaAHash({ tab }, base), base)).toEqual({ tab });
  });
  it("un hash de otro presupuesto no se interpreta", () => {
    expect(parseRuta("#/p/otro/ingresos", base)).toEqual({ tab: "resumen" });
    expect(parseRuta("#/p/abc1234/ingresos", base)).toEqual({ tab: "resumen" });
  });
  it("presupuestoDeHash lee el id o devuelve null en la lista", () => {
    expect(presupuestoDeHash("#/p/abc123")).toBe("abc123");
    expect(presupuestoDeHash("#/p/abc123/gastos/x")).toBe("abc123");
    expect(presupuestoDeHash("#/p/inicial/ingresos")).toBe("inicial");
    for (const h of ["", "#/", "#/gastos", "#/p/", "#/p/../x", "#/p/a b"]) expect(presupuestoDeHash(h)).toBeNull();
  });
  it("hashPresupuesto arma el link", () => {
    expect(hashPresupuesto("abc")).toBe("#/p/abc");
    expect(presupuestoDeHash(hashPresupuesto("abc"))).toBe("abc");
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
