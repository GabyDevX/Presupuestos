import { describe, expect, it } from "vitest";
import { borrarEjemplos, hayEjemplos, mover } from "@/lib/acciones";
import { totales } from "@/lib/calc";
import { crearSeed } from "@/lib/seed";
import { esPresupuestoValido } from "@/lib/validar";
import { resolverGuardado } from "@/lib/versiones";
import { item, presupuesto, seccion } from "./helpers";

describe("datos de ejemplo (seed)", () => {
  it("es un documento válido", () => {
    expect(esPresupuestoValido(crearSeed())).toBe(true);
  });
  it("tiene las seis categorías pedidas, en orden", () => {
    expect(crearSeed().secciones.map((s) => s.nombre)).toEqual([
      "Auto", "Casa", "Navidad", "Fin de año", "Cumpleaños", "Vacaciones (enero)",
    ]);
  });
  it("tiene las subsecciones de Navidad y Fin de año", () => {
    const s = crearSeed().secciones;
    expect(s[2].subsecciones.map((x) => x.nombre)).toEqual([
      "Regalos", "Costo del viaje", "Comida / preparación", "Decoración y cosas para la casa",
    ]);
    expect(s[3].subsecciones.map((x) => x.nombre)).toEqual([
      "Viaje", "Cosas para la casa", "Comida", "Gastos extra",
    ]);
  });
  it("Cumpleaños tiene un bloque por hijo", () => {
    expect(crearSeed().secciones[4].subsecciones).toHaveLength(2);
  });
  it("el viaje de Fin de año permite 'nos quedamos en casa'", () => {
    const viaje = crearSeed().secciones[3].subsecciones[0];
    expect(viaje.omitirTexto).toMatch(/casa/i);
  });
  it("patente y seguro son ítems fijos", () => {
    const s = crearSeed().secciones;
    expect(s[0].items[0]).toMatchObject({ nombre: "Patente", fijo: true });
    expect(s[1].items[0].nombre).toMatch(/Seguro de la casa/);
    expect(s[1].items[0].fijo).toBe(true);
  });
  it("las vacaciones son de tipo vacaciones y hay destinos de ejemplo", () => {
    const p = crearSeed();
    expect(p.secciones[5].tipo).toBe("vacaciones");
    expect(p.destinos.length).toBeGreaterThan(1);
  });
  it("todo lo que no es estructura está marcado como ejemplo y rotulado", () => {
    const p = crearSeed();
    for (const i of p.ingresos) expect(i).toMatchObject({ ejemplo: true });
    for (const d of p.destinos) expect(d.nombre).toMatch(/ejemplo/);
    expect(p.ingresos.every((i) => /ejemplo/.test(i.nombre))).toBe(true);
  });
  it("los ids son únicos", () => {
    const p = crearSeed();
    const ids = [
      ...p.ingresos.map((x) => x.id), ...p.destinos.map((x) => x.id),
      ...p.secciones.flatMap((s) => [s.id, ...s.items.map((i) => i.id),
        ...s.subsecciones.flatMap((x) => [x.id, ...x.items.map((i) => i.id)])]),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("totales de ejemplo conocidos", () => {
    expect(totales(crearSeed())).toEqual({
      ingresos: 160000, planificado: 76700, pagado: 1200, pendiente: 75500,
      balance: 83300, balanceSinDestinos: 127300,
    });
  });
  it("crearSeed devuelve copias independientes", () => {
    const a = crearSeed();
    a.ingresos.length = 0;
    expect(crearSeed().ingresos.length).toBeGreaterThan(0);
  });
});

describe("borrarEjemplos / hayEjemplos", () => {
  it("el seed tiene ejemplos", () => {
    expect(hayEjemplos(crearSeed())).toBe(true);
  });
  it("borra los ejemplos y deja todo en 0", () => {
    const p = crearSeed();
    borrarEjemplos(p);
    expect(hayEjemplos(p)).toBe(false);
    expect(totales(p)).toEqual({
      ingresos: 0, planificado: 0, pagado: 0, pendiente: 0, balance: 0, balanceSinDestinos: 0,
    });
    expect(p.ingresos).toEqual([]);
    expect(p.destinos).toEqual([]);
  });
  it("conserva secciones, subsecciones e ítems fijos", () => {
    const p = crearSeed();
    const subs = p.secciones.map((s) => s.subsecciones.length);
    borrarEjemplos(p);
    expect(p.secciones).toHaveLength(6);
    expect(p.secciones.map((s) => s.subsecciones.length)).toEqual(subs);
    expect(p.secciones[0].items.map((i) => i.nombre)).toEqual(["Patente"]);
    expect(p.secciones[1].items).toHaveLength(1);
  });
  it("conserva los datos propios que se cargaron después", () => {
    const p = crearSeed();
    p.ingresos.push({ id: "mio", nombre: "Mi extra", persona: "yo", fecha: "2026-12-01", monto: 500 });
    p.secciones[2].subsecciones[0].items.push(item(700, { nombre: "Mi regalo" }));
    p.destinos.push({ id: "d", nombre: "Mi lugar", notas: "", seleccionado: true, transporte: 1, estadia: 2, comidas: 3, otros: 4 });
    borrarEjemplos(p);
    expect(p.ingresos.map((i) => i.id)).toEqual(["mio"]);
    expect(p.secciones[2].subsecciones[0].items.map((i) => i.nombre)).toEqual(["Mi regalo"]);
    expect(p.destinos.map((d) => d.id)).toEqual(["d"]);
    expect(totales(p).planificado).toBe(710);
  });
  it("sin ejemplos no hace nada", () => {
    const p = presupuesto({ secciones: [seccion({ items: [item(5)] })] });
    const antes = structuredClone(p);
    borrarEjemplos(p);
    expect(p).toEqual(antes);
  });
});

describe("mover", () => {
  it("sube y baja", () => {
    const a = [1, 2, 3];
    mover(a, 1, -1);
    expect(a).toEqual([2, 1, 3]);
    mover(a, 1, 1);
    expect(a).toEqual([2, 3, 1]);
  });
  it("no hace nada en los bordes ni con índices inválidos", () => {
    const a = [1, 2, 3];
    mover(a, 0, -1);
    mover(a, 2, 1);
    mover(a, 9, -1);
    mover(a, -1, 1);
    expect(a).toEqual([1, 2, 3]);
  });
});

describe("validación del documento", () => {
  const ok = () => structuredClone(crearSeed());
  const roto = (fn: (p: any) => void) => { const p: any = ok(); fn(p); return p; };

  it("acepta un documento vacío válido", () => {
    expect(esPresupuestoValido(presupuesto())).toBe(true);
  });
  it.each([null, undefined, 5, "x", [], {}])("rechaza %p", (x) => {
    expect(esPresupuestoValido(x)).toBe(false);
  });
  it("rechaza rev inválida", () => {
    for (const rev of [-1, 1.5, "2", undefined]) expect(esPresupuestoValido(roto((p) => (p.rev = rev)))).toBe(false);
  });
  it("rechaza montos negativos, infinitos o no numéricos", () => {
    expect(esPresupuestoValido(roto((p) => (p.ingresos[0].monto = -1)))).toBe(false);
    expect(esPresupuestoValido(roto((p) => (p.secciones[0].items[0].monto = Infinity)))).toBe(false);
    expect(esPresupuestoValido(roto((p) => (p.destinos[0].estadia = "10")))).toBe(false);
    expect(esPresupuestoValido(roto((p) => (p.destinos[0].otros = NaN)))).toBe(false);
  });
  it("rechaza persona o fecha inválidas", () => {
    expect(esPresupuestoValido(roto((p) => (p.ingresos[0].persona = "otro")))).toBe(false);
    expect(esPresupuestoValido(roto((p) => (p.ingresos[0].fecha = "20/12/2026")))).toBe(false);
  });
  it("acepta fecha vacía", () => {
    expect(esPresupuestoValido(roto((p) => (p.ingresos[0].fecha = "")))).toBe(true);
  });
  it("rechaza tipos incorrectos en ítems y subsecciones", () => {
    expect(esPresupuestoValido(roto((p) => (p.secciones[0].items[0].pagado = "si")))).toBe(false);
    expect(esPresupuestoValido(roto((p) => (p.secciones[2].subsecciones[0].items = {})))).toBe(false);
    expect(esPresupuestoValido(roto((p) => (p.secciones[2].subsecciones[0].omitida = 1)))).toBe(false);
  });
  it("rechaza tipo de sección desconocido", () => {
    expect(esPresupuestoValido(roto((p) => (p.secciones[0].tipo = "otro")))).toBe(false);
  });
  it("rechaza textos gigantes", () => {
    expect(esPresupuestoValido(roto((p) => (p.destinos[0].notas = "x".repeat(6000))))).toBe(false);
  });
  it("rechaza listas que faltan", () => {
    for (const k of ["ingresos", "secciones", "destinos"]) {
      expect(esPresupuestoValido(roto((p) => delete p[k]))).toBe(false);
    }
  });
});

describe("versiones (dos personas editando)", () => {
  it("acepta el guardado sobre la versión vigente e incrementa rev", () => {
    const actual = presupuesto({ rev: 3 });
    const r = resolverGuardado(actual, presupuesto({ rev: 3, ingresos: [] }));
    expect(r).toMatchObject({ ok: true, guardado: { rev: 4 } });
  });
  it("rechaza un guardado sobre una versión vieja y devuelve la actual", () => {
    const actual = presupuesto({ rev: 5 });
    const r = resolverGuardado(actual, presupuesto({ rev: 4 }));
    expect(r).toEqual({ ok: false, actual });
  });
  it("rechaza también una versión del futuro", () => {
    expect(resolverGuardado(presupuesto({ rev: 1 }), presupuesto({ rev: 2 })).ok).toBe(false);
  });
  it("dos personas parten de rev 0: gana la primera, la segunda recibe conflicto", () => {
    let guardado = presupuesto({ rev: 0 });
    const aplicar = (nuevo: ReturnType<typeof presupuesto>) => {
      const r = resolverGuardado(guardado, nuevo);
      if (r.ok) guardado = r.guardado;
      return r.ok;
    };
    expect(aplicar(presupuesto({ rev: 0, ingresos: [] }))).toBe(true);
    expect(aplicar(presupuesto({ rev: 0, ingresos: [] }))).toBe(false);
    expect(guardado.rev).toBe(1);
    expect(aplicar(presupuesto({ rev: 1 }))).toBe(true);
    expect(guardado.rev).toBe(2);
  });
  it("no muta los argumentos", () => {
    const nuevo = presupuesto({ rev: 0 });
    resolverGuardado(presupuesto({ rev: 0 }), nuevo);
    expect(nuevo.rev).toBe(0);
  });
});
