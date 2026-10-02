import { describe, expect, it } from "vitest";
import { totales } from "@/lib/calc";
import { crearEnBlanco, duplicarComoPlantilla, sumarAnio } from "@/lib/plantilla";
import { crearSeed } from "@/lib/seed";
import { esPresupuestoValido } from "@/lib/validar";
import { crearEjemplo } from "./ejemplo";
import { destino, ingreso, item, presupuesto, seccion } from "./helpers";

const AHORA = "2027-10-01T10:00:00.000Z";

describe("sumarAnio", () => {
  it("suma un año", () => {
    expect(sumarAnio("2026-12-15")).toBe("2027-12-15");
    expect(sumarAnio("2026-01-01")).toBe("2027-01-01");
  });
  it("el 29 de febrero pasa al 28", () => {
    expect(sumarAnio("2028-02-29")).toBe("2029-02-28");
  });
  it("fechas vacías o inválidas quedan igual", () => {
    expect(sumarAnio("")).toBe("");
    expect(sumarAnio("15/12/2026")).toBe("15/12/2026");
  });
});

describe("duplicarComoPlantilla", () => {
  const copia = () => duplicarComoPlantilla(crearSeed(), "Fin de año 2027", AHORA);

  it("es un documento válido, nuevo (rev 0) y con el nombre dado", () => {
    const c = copia();
    expect(esPresupuestoValido(c)).toBe(true);
    expect(c).toMatchObject({ nombre: "Fin de año 2027", rev: 0, creado: AHORA });
  });
  it("todos los montos quedan en 0 y los totales en 0", () => {
    const t = totales(copia());
    expect(t).toEqual({ ingresos: 0, planificado: 0, pagado: 0, pendiente: 0, balance: 0, balanceSinDestinos: 0 });
  });
  it("conserva categorías, subsecciones, ítems y personas", () => {
    const o = crearSeed();
    const c = copia();
    expect(c.secciones.map((s) => s.nombre)).toEqual(o.secciones.map((s) => s.nombre));
    expect(c.secciones[2].subsecciones[0].items.map((i) => i.nombre)).toEqual(
      o.secciones[2].subsecciones[0].items.map((i) => i.nombre),
    );
    expect(c.secciones[2].subsecciones[0].items).toHaveLength(16);
  });
  it("conserva el presupuesto general de la lista, en 0", () => {
    expect(copia().secciones[2].subsecciones[0]).toMatchObject({ montoBase: 0, etiquetaItem: "persona" });
  });
  it("los ingresos conservan nombre y persona, con la fecha corrida un año", () => {
    const c = copia();
    expect(c.ingresos.map((i) => [i.nombre, i.persona, i.fecha, i.monto])).toEqual([
      ["Aguinaldo", "yo", "2027-12-15", 0],
      ["Aguinaldo", "esposa", "2027-12-15", 0],
      ["Salario vacacional", "yo", "2028-01-15", 0],
      ["Salario vacacional", "esposa", "2028-01-15", 0],
    ]);
  });
  it("desmarca lo pagado y lo editado a mano", () => {
    const o = presupuesto({
      secciones: [
        seccion({
          items: [item(100, { pagado: true })],
          subsecciones: [{ id: "s", nombre: "S", montoBase: 500, items: [item(900, { pagado: true, manual: true })] }],
        }),
      ],
    });
    const c = duplicarComoPlantilla(o, "x", AHORA);
    expect(c.secciones[0].items[0]).toMatchObject({ monto: 0, pagado: false });
    expect(c.secciones[0].subsecciones[0].items[0]).toMatchObject({ monto: 0, pagado: false, manual: false });
    expect(c.secciones[0].subsecciones[0].montoBase).toBe(0);
  });
  it("'nos quedamos en casa' vuelve a desmarcarse", () => {
    const o = crearSeed();
    o.secciones[3].subsecciones[0].omitida = true;
    expect(duplicarComoPlantilla(o, "x", AHORA).secciones[3].subsecciones[0].omitida).toBe(false);
  });
  it("conserva los ítems fijos y las notas", () => {
    const c = copia();
    expect(c.secciones[0].items[0].fijo).toBe(true);
    expect(c.secciones[5].nota).toMatch(/Vamos los 4/);
  });
  it("no copia destinos de vacaciones", () => {
    const o = presupuesto({ destinos: [destino({ estadia: 99 }, { seleccionado: true })] });
    expect(duplicarComoPlantilla(o, "x", AHORA).destinos).toEqual([]);
  });
  it("no copia datos de ejemplo", () => {
    const c = duplicarComoPlantilla(crearEjemplo(), "x", AHORA);
    expect(c.ingresos).toEqual([]);
    expect(JSON.stringify(c)).not.toContain("ejemplo");
    expect(c.secciones[2].subsecciones[0].items).toEqual([]);
  });
  it("no modifica el original ni comparte referencias con él", () => {
    const o = crearSeed();
    const antes = structuredClone(o);
    const c = duplicarComoPlantilla(o, "x", AHORA);
    c.secciones[0].items[0].nombre = "cambiado";
    expect(o).toEqual(antes);
  });
  it("sin archivado: la copia nace activa", () => {
    const o = crearSeed();
    o.archivado = true;
    expect(duplicarComoPlantilla(o, "x", AHORA).archivado).toBeUndefined();
  });
  it("nombre vacío o con espacios usa uno por defecto; uno largo se recorta", () => {
    expect(duplicarComoPlantilla(crearSeed(), "   ", AHORA).nombre).toBe("Nuevo presupuesto");
    expect(duplicarComoPlantilla(crearSeed(), "  Hola  ", AHORA).nombre).toBe("Hola");
    expect(duplicarComoPlantilla(crearSeed(), "x".repeat(300), AHORA).nombre).toHaveLength(120);
  });
  it("ingresos con monto de fecha vacía no rompen", () => {
    const o = presupuesto({ ingresos: [ingreso(5, { fecha: "" })] });
    expect(duplicarComoPlantilla(o, "x", AHORA).ingresos[0]).toMatchObject({ fecha: "", monto: 0 });
  });
});

describe("crearEnBlanco", () => {
  it("es válido, vacío y con una sección", () => {
    const b = crearEnBlanco("Mi presupuesto", AHORA);
    expect(esPresupuestoValido(b)).toBe(true);
    expect(b).toMatchObject({ nombre: "Mi presupuesto", rev: 0, ingresos: [], destinos: [] });
    expect(b.secciones).toHaveLength(1);
    expect(totales(b).balance).toBe(0);
  });
  it("nombre por defecto", () => {
    expect(crearEnBlanco("", AHORA).nombre).toBe("Nuevo presupuesto");
  });
});
