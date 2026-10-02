import { describe, expect, it } from "vitest";
import { cronograma, montoItem, totalSubseccion, totales, totalesSeccion } from "@/lib/calc";
import { crearSeed } from "@/lib/seed";
import { NOMBRES_PERSONA } from "@/lib/types";
import { esPresupuestoValido } from "@/lib/validar";
import { item, presupuesto, seccion } from "./helpers";

describe("datos reales precargados", () => {
  const p = () => crearSeed();
  const sec = (nombre: RegExp) => p().secciones.find((s) => nombre.test(s.nombre))!;

  it("es un documento válido y empieza en rev 0", () => {
    expect(esPresupuestoValido(p())).toBe(true);
    expect(p().rev).toBe(0);
  });
  it("no contiene datos de ejemplo", () => {
    const todo = JSON.stringify(p());
    expect(todo).not.toContain('"ejemplo"');
    expect(todo).not.toMatch(/ejemplo/i);
  });
  it("las personas se muestran con su nombre", () => {
    expect(NOMBRES_PERSONA).toEqual({ yo: "Gabriel", esposa: "Camila" });
  });
  it("ingresos: aguinaldos a mediados de diciembre y salarios vacacionales a mediados de enero", () => {
    const filas = cronograma(p().ingresos).map(({ ingreso: i, acumulado }) => [i.nombre, i.persona, i.fecha, i.monto, acumulado]);
    expect(filas).toEqual([
      ["Aguinaldo", "yo", "2026-12-15", 60000, 60000],
      ["Aguinaldo", "esposa", "2026-12-15", 15000, 75000],
      ["Salario vacacional", "yo", "2027-01-15", 27000, 102000],
      ["Salario vacacional", "esposa", "2027-01-15", 9900, 111900],
    ]);
  });
  it("patente (enero) y seguro de la casa (febrero) con sus montos, fijos y sin pagar", () => {
    const [patente] = sec(/Auto/).items;
    const [seguro] = sec(/Casa/).items;
    expect(patente).toMatchObject({ monto: 25500, pagado: false, fijo: true });
    expect(patente.nombre).toMatch(/enero/i);
    expect(seguro).toMatchObject({ monto: 13000, pagado: false, fijo: true });
    expect(seguro.nombre).toMatch(/febrero/i);
  });
  it("nada está pagado", () => {
    const t = totales(p());
    expect(t.pagado).toBe(0);
    expect(t.pendiente).toBe(t.planificado);
  });
  it("totales iniciales: 111.900 de ingresos, 38.500 de gastos fijos, sobran 73.400", () => {
    expect(totales(p())).toEqual({
      ingresos: 111900, planificado: 38500, pagado: 0, pendiente: 38500,
      balance: 73400, balanceSinDestinos: 73400,
    });
  });
  it("la lista de regalos tiene las 16 personas en orden, con presupuesto general", () => {
    const regalos = sec(/Navidad/).subsecciones[0];
    expect(regalos.nombre).toBe("Regalos");
    expect(regalos.items.map((i) => i.nombre)).toEqual([
      "Ronald", "Maryorie", "Pamela", "Rodolfo", "Sofia", "Joaquin", "Nene", "Alessander",
      "Mamaelo", "Papaelo", "Christopher", "Natalia", "Manuel", "Amelia", "Camila", "Gabriel",
    ]);
    expect(regalos.montoBase).toBe(0);
    expect(regalos.etiquetaItem).toBe("persona");
    expect(regalos.items.every((i) => !i.manual && !i.pagado)).toBe(true);
  });
  it("Navidad mantiene viaje, comida y decoración", () => {
    expect(sec(/Navidad/).subsecciones.slice(1).map((s) => s.nombre)).toEqual([
      "Costo del viaje", "Comida / preparación", "Decoración y cosas para la casa",
    ]);
  });
  it("cumpleaños de enero: Amelia (4), Manuel (6) y uno compartido, cada uno con sus ítems", () => {
    const subs = sec(/Cumpleaños/).subsecciones;
    expect(subs.map((s) => s.nombre)).toEqual([
      "Amelia — 4 de enero", "Manuel — 6 de enero", "Cumpleaños compartido — fecha por definir",
    ]);
    for (const s of subs) expect(s.items.length).toBeGreaterThanOrEqual(3);
  });
  it("Fin de año permite 'nos quedamos en casa' en el viaje", () => {
    expect(sec(/Fin de año/).subsecciones[0].omitirTexto).toMatch(/casa/i);
  });
  it("vacaciones: sin destinos todavía y nota de que van los 4", () => {
    const v = sec(/Vacaciones/);
    expect(v.tipo).toBe("vacaciones");
    expect(v.nota).toMatch(/4/);
    expect(p().destinos).toEqual([]);
  });
  it("ids únicos", () => {
    const d = p();
    const ids = [
      ...d.ingresos.map((x) => x.id),
      ...d.secciones.flatMap((s) => [s.id, ...s.items.map((i) => i.id),
        ...s.subsecciones.flatMap((x) => [x.id, ...x.items.map((i) => i.id)])]),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("presupuesto general por persona (lista de regalos)", () => {
  const lista = (montoBase: number | undefined, items = [item(0), item(0), item(0)]) => ({
    id: "r", nombre: "Regalos", items, montoBase,
  });

  it("con presupuesto general, cada persona sin monto propio vale el general", () => {
    const s = lista(1500);
    expect(s.items.map((i) => montoItem(i, s))).toEqual([1500, 1500, 1500]);
    expect(totalSubseccion(s)).toBe(4500);
  });
  it("editar una persona a mano reemplaza solo su monto", () => {
    const s = lista(1500);
    s.items[1].monto = 4000;
    s.items[1].manual = true;
    expect(s.items.map((i) => montoItem(i, s))).toEqual([1500, 4000, 1500]);
    expect(totalSubseccion(s)).toBe(7000);
  });
  it("cambiar el general actualiza a todos menos a los editados a mano", () => {
    const s = lista(1500);
    s.items[0].monto = 100;
    s.items[0].manual = true;
    s.montoBase = 2000;
    expect(totalSubseccion(s)).toBe(100 + 2000 + 2000);
  });
  it("un monto manual de 0 significa 'no hay regalo' y no sigue al general", () => {
    const s = lista(1500);
    s.items[2].monto = 0;
    s.items[2].manual = true;
    expect(totalSubseccion(s)).toBe(3000);
  });
  it("volver al general (manual = false) restaura el monto general", () => {
    const s = lista(1500);
    s.items[0].monto = 9999;
    s.items[0].manual = true;
    s.items[0].manual = false;
    expect(montoItem(s.items[0], s)).toBe(1500);
  });
  it("sin montoBase se usa el monto propio de cada ítem (comportamiento normal)", () => {
    const s = lista(undefined, [item(10), item(20)]);
    expect(totalSubseccion(s)).toBe(30);
  });
  it("agregar una persona nueva la suma al general", () => {
    const s = lista(1000);
    s.items.push(item(0));
    expect(totalSubseccion(s)).toBe(4000);
  });
  it("el total general y por sección usan los montos vigentes", () => {
    const s = lista(1000);
    s.items[0].monto = 300;
    s.items[0].manual = true;
    const sec = seccion({ subsecciones: [s] });
    expect(totalesSeccion(sec, [])).toEqual({ planificado: 2300, pagado: 0, pendiente: 2300 });
    expect(totales(presupuesto({ secciones: [sec] })).planificado).toBe(2300);
  });
  it("pagado usa el monto vigente de cada persona", () => {
    const s = lista(1000);
    s.items[0].pagado = true;
    s.items[1].pagado = true;
    s.items[1].monto = 250;
    s.items[1].manual = true;
    const sec = seccion({ subsecciones: [s] });
    expect(totalesSeccion(sec, [])).toEqual({ planificado: 3000 - 750, pagado: 1250, pendiente: 1000 });
  });
  it("una lista omitida no cuenta aunque tenga general", () => {
    const s = { ...lista(1000), omitida: true };
    expect(totalesSeccion(seccion({ subsecciones: [s] }), []).planificado).toBe(0);
  });
  it("el montoBase no se aplica a ítems directos de la sección", () => {
    const sec = seccion({ items: [item(50)], subsecciones: [lista(1000)] });
    expect(totalesSeccion(sec, []).planificado).toBe(50 + 3000);
  });
  it("redondea correctamente con decimales", () => {
    const s = lista(0.1, [item(0), item(0), item(0)]);
    expect(totalSubseccion(s)).toBe(0.3);
  });
});

describe("validación de los campos nuevos", () => {
  const base = () => structuredClone(crearSeed()) as any;
  it("acepta montoBase, manual, etiquetaItem y nota", () => {
    expect(esPresupuestoValido(base())).toBe(true);
  });
  it("rechaza montoBase negativo o no numérico", () => {
    const a = base(); a.secciones[2].subsecciones[0].montoBase = -1;
    const b = base(); b.secciones[2].subsecciones[0].montoBase = "5";
    expect(esPresupuestoValido(a)).toBe(false);
    expect(esPresupuestoValido(b)).toBe(false);
  });
  it("rechaza manual no booleano y nota no textual", () => {
    const a = base(); a.secciones[2].subsecciones[0].items[0].manual = "si";
    const b = base(); b.secciones[5].nota = 5;
    expect(esPresupuestoValido(a)).toBe(false);
    expect(esPresupuestoValido(b)).toBe(false);
  });
});
