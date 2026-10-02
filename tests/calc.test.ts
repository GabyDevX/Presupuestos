import { describe, expect, it } from "vitest";
import {
  balanceSoloDestino, cronograma, formatoMoneda, redondear, totalDestino, totalDestinosElegidos,
  totalPorPersona, totales, totalesSeccion,
} from "@/lib/calc";
import { destino, ingreso, item, presupuesto, seccion } from "./helpers";

const vacaciones = (extra = {}) => seccion({ tipo: "vacaciones", nombre: "Vacaciones", ...extra });

describe("redondear", () => {
  it("elimina restos de punto flotante", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(redondear(0.1 + 0.2)).toBe(0.3);
  });
  it("redondea a centavos", () => {
    expect(redondear(1.005)).toBe(1.01);
    expect(redondear(2.349)).toBe(2.35);
  });
});

describe("totalDestino / totalDestinosElegidos", () => {
  it("suma transporte, estadía, comidas y otros", () => {
    expect(totalDestino(destino({ transporte: 1, estadia: 20, comidas: 300, otros: 4000 }))).toBe(4321);
  });
  it("un destino vacío cuesta 0", () => {
    expect(totalDestino(destino())).toBe(0);
  });
  it("ignora valores no numéricos (NaN, undefined)", () => {
    const d = destino({ transporte: 100 });
    (d as unknown as Record<string, unknown>).estadia = NaN;
    (d as unknown as Record<string, unknown>).comidas = undefined;
    expect(totalDestino(d)).toBe(100);
  });
  it("solo suma los destinos seleccionados", () => {
    const ds = [
      destino({ estadia: 100 }, { seleccionado: true }),
      destino({ estadia: 50 }),
      destino({ estadia: 25 }, { seleccionado: true }),
    ];
    expect(totalDestinosElegidos(ds)).toBe(125);
  });
  it("sin destinos o sin ninguno elegido da 0", () => {
    expect(totalDestinosElegidos([])).toBe(0);
    expect(totalDestinosElegidos([destino({ estadia: 9 })])).toBe(0);
  });
});

describe("totalesSeccion", () => {
  it("sección vacía: todo en 0", () => {
    expect(totalesSeccion(seccion(), [])).toEqual({ planificado: 0, pagado: 0, pendiente: 0 });
  });
  it("suma ítems directos y de subsecciones", () => {
    const s = seccion({
      items: [item(100)],
      subsecciones: [
        { id: "a", nombre: "A", items: [item(10), item(20)] },
        { id: "b", nombre: "B", items: [item(5)] },
      ],
    });
    expect(totalesSeccion(s, []).planificado).toBe(135);
  });
  it("separa pagado de pendiente según el check", () => {
    const s = seccion({ items: [item(100, { pagado: true }), item(50), item(25, { pagado: true })] });
    expect(totalesSeccion(s, [])).toEqual({ planificado: 175, pagado: 125, pendiente: 50 });
  });
  it("todo pagado: pendiente 0", () => {
    const s = seccion({ items: [item(100, { pagado: true })] });
    expect(totalesSeccion(s, []).pendiente).toBe(0);
  });
  it("una subsección omitida no cuenta ni como planificado ni como pagado", () => {
    const s = seccion({
      subsecciones: [
        { id: "v", nombre: "Viaje", omitida: true, items: [item(1000, { pagado: true }), item(500)] },
        { id: "c", nombre: "Comida", items: [item(200)] },
      ],
    });
    expect(totalesSeccion(s, [])).toEqual({ planificado: 200, pagado: 0, pendiente: 200 });
  });
  it("al desmarcar 'omitida' el viaje vuelve a contar", () => {
    const s = seccion({ subsecciones: [{ id: "v", nombre: "Viaje", omitida: false, items: [item(1000)] }] });
    expect(totalesSeccion(s, []).planificado).toBe(1000);
  });
  it("los ítems directos cuentan aunque haya subsecciones omitidas", () => {
    const s = seccion({
      items: [item(7)],
      subsecciones: [{ id: "v", nombre: "V", omitida: true, items: [item(99)] }],
    });
    expect(totalesSeccion(s, []).planificado).toBe(7);
  });
  it("vacaciones: suma los destinos elegidos como pendientes", () => {
    const s = vacaciones({ items: [item(100, { pagado: true })] });
    const ds = [destino({ estadia: 1000 }, { seleccionado: true }), destino({ estadia: 5000 })];
    expect(totalesSeccion(s, ds)).toEqual({ planificado: 1100, pagado: 100, pendiente: 1000 });
  });
  it("una sección que no es de vacaciones no suma destinos", () => {
    const ds = [destino({ estadia: 1000 }, { seleccionado: true })];
    expect(totalesSeccion(seccion(), ds).planificado).toBe(0);
  });
  it("se puede forzar contar/no contar destinos", () => {
    const ds = [destino({ estadia: 1000 }, { seleccionado: true })];
    expect(totalesSeccion(seccion(), ds, true).planificado).toBe(1000);
    expect(totalesSeccion(vacaciones(), ds, false).planificado).toBe(0);
  });
  it("monto 0 o NaN no rompe la suma", () => {
    const roto = item(0);
    (roto as unknown as Record<string, unknown>).monto = NaN;
    expect(totalesSeccion(seccion({ items: [roto, item(10)] }), []).planificado).toBe(10);
  });
  it("evita errores de punto flotante en las sumas", () => {
    const s = seccion({ items: [item(0.1), item(0.2)] });
    expect(totalesSeccion(s, []).planificado).toBe(0.3);
  });
});

describe("totales generales", () => {
  it("presupuesto vacío: todo en 0 y balance 0", () => {
    expect(totales(presupuesto())).toEqual({
      ingresos: 0, planificado: 0, pagado: 0, pendiente: 0, balance: 0, balanceSinDestinos: 0,
    });
  });
  it("balance positivo: ingresos - gastos", () => {
    const p = presupuesto({ ingresos: [ingreso(1000), ingreso(500)], secciones: [seccion({ items: [item(400)] })] });
    const t = totales(p);
    expect(t.ingresos).toBe(1500);
    expect(t.planificado).toBe(400);
    expect(t.balance).toBe(1100);
  });
  it("balance negativo cuando los gastos superan los ingresos", () => {
    const p = presupuesto({ ingresos: [ingreso(100)], secciones: [seccion({ items: [item(250)] })] });
    expect(totales(p).balance).toBe(-150);
  });
  it("balance exactamente 0 con decimales no queda como -0,00000001", () => {
    const p = presupuesto({
      ingresos: [ingreso(0.3)],
      secciones: [seccion({ items: [item(0.1), item(0.2)] })],
    });
    expect(totales(p).balance).toBe(0);
  });
  it("gastos sin ingresos: balance = -gastos", () => {
    expect(totales(presupuesto({ secciones: [seccion({ items: [item(80)] })] })).balance).toBe(-80);
  });
  it("ingresos sin gastos: balance = ingresos", () => {
    expect(totales(presupuesto({ ingresos: [ingreso(80)] })).balance).toBe(80);
  });
  it("suma varias secciones y reparte pagado/pendiente", () => {
    const p = presupuesto({
      ingresos: [ingreso(1000)],
      secciones: [
        seccion({ items: [item(100, { pagado: true }), item(100)] }),
        seccion({ subsecciones: [{ id: "x", nombre: "x", items: [item(50, { pagado: true })] }] }),
      ],
    });
    expect(totales(p)).toMatchObject({ planificado: 250, pagado: 150, pendiente: 100, balance: 750 });
  });
  it("el seguro de la casa (se paga en febrero) cuenta ya en el presupuesto actual", () => {
    const seguro = item(12000, { nombre: "Seguro de la casa", fijo: true });
    const t = totales(presupuesto({ ingresos: [ingreso(20000)], secciones: [seccion({ items: [seguro] })] }));
    expect(t.planificado).toBe(12000);
    expect(t.pendiente).toBe(12000);
    expect(t.balance).toBe(8000);
  });
  it("pagar un ítem no cambia el balance (solo mueve pendiente a pagado)", () => {
    const it = item(300);
    const p = presupuesto({ ingresos: [ingreso(1000)], secciones: [seccion({ items: [it] })] });
    const antes = totales(p);
    it.pagado = true;
    const despues = totales(p);
    expect(despues.balance).toBe(antes.balance);
    expect(despues.pagado).toBe(300);
    expect(despues.pendiente).toBe(0);
  });
  it("planificado = pagado + pendiente siempre", () => {
    const p = presupuesto({
      secciones: [seccion({ items: [item(33.33, { pagado: true }), item(66.67), item(0.01)] })],
    });
    const t = totales(p);
    expect(redondear(t.pagado + t.pendiente)).toBe(t.planificado);
  });
});

describe("escenarios de vacaciones", () => {
  const base = () => {
    const playa = destino({ transporte: 4000, estadia: 25000, comidas: 12000, otros: 3000 });
    const campo = destino({ transporte: 6000, comidas: 8000, otros: 2000 });
    const p = presupuesto({
      ingresos: [ingreso(100000)],
      secciones: [seccion({ items: [item(10000)] }), vacaciones()],
      destinos: [playa, campo],
    });
    return { p, playa, campo };
  };

  it("sin destinos elegidos, vacaciones no suma nada", () => {
    const { p } = base();
    expect(totales(p).planificado).toBe(10000);
  });
  it("elegir un destino suma su total y baja el balance", () => {
    const { p, playa } = base();
    playa.seleccionado = true;
    const t = totales(p);
    expect(t.planificado).toBe(54000);
    expect(t.balance).toBe(46000);
    expect(t.pendiente).toBe(54000);
  });
  it("elegir dos destinos suma ambos", () => {
    const { p, playa, campo } = base();
    playa.seleccionado = campo.seleccionado = true;
    expect(totales(p).planificado).toBe(10000 + 44000 + 16000);
  });
  it("deseleccionar vuelve al estado anterior", () => {
    const { p, playa } = base();
    const inicial = totales(p);
    playa.seleccionado = true;
    playa.seleccionado = false;
    expect(totales(p)).toEqual(inicial);
  });
  it("cambiar un costo del destino elegido actualiza el total", () => {
    const { p, playa } = base();
    playa.seleccionado = true;
    playa.estadia = 30000;
    expect(totales(p).planificado).toBe(10000 + 49000);
  });
  it("balanceSinDestinos no depende de qué destinos estén elegidos", () => {
    const { p, playa, campo } = base();
    const sin = totales(p).balanceSinDestinos;
    playa.seleccionado = true;
    expect(totales(p).balanceSinDestinos).toBe(sin);
    campo.seleccionado = true;
    expect(totales(p).balanceSinDestinos).toBe(sin);
    expect(sin).toBe(90000);
  });
  it("balanceSoloDestino responde '¿y si vamos solo a este lugar?'", () => {
    const { p, playa, campo } = base();
    const { balanceSinDestinos } = totales(p);
    expect(balanceSoloDestino(balanceSinDestinos, playa)).toBe(46000);
    expect(balanceSoloDestino(balanceSinDestinos, campo)).toBe(74000);
  });
  it("balanceSoloDestino es igual al balance real cuando solo ese destino está elegido", () => {
    const { p, playa } = base();
    playa.seleccionado = true;
    const t = totales(p);
    expect(balanceSoloDestino(t.balanceSinDestinos, playa)).toBe(t.balance);
  });
  it("un destino que deja el balance en negativo se detecta", () => {
    const { p, playa } = base();
    playa.estadia = 200000;
    expect(balanceSoloDestino(totales(p).balanceSinDestinos, playa)).toBeLessThan(0);
  });
  it("si no hay sección de vacaciones, los destinos no se cuentan", () => {
    const { p, playa } = base();
    p.secciones = p.secciones.filter((s) => s.tipo !== "vacaciones");
    playa.seleccionado = true;
    const t = totales(p);
    expect(t.planificado).toBe(10000);
    expect(t.balanceSinDestinos).toBe(t.balance);
  });
  it("con dos secciones de vacaciones los destinos se cuentan una sola vez", () => {
    const { p, playa } = base();
    p.secciones.push(vacaciones());
    playa.seleccionado = true;
    expect(totales(p).planificado).toBe(54000);
  });
  it("renombrar la sección de vacaciones no afecta (se identifica por tipo)", () => {
    const { p, playa } = base();
    p.secciones[1].nombre = "Enero";
    playa.seleccionado = true;
    expect(totales(p).planificado).toBe(54000);
  });
  it("ítems propios de vacaciones + destino elegido se suman", () => {
    const { p, playa } = base();
    p.secciones[1].items.push(item(1500, { pagado: true }));
    playa.seleccionado = true;
    const t = totales(p);
    expect(t.planificado).toBe(10000 + 1500 + 44000);
    expect(t.pagado).toBe(1500);
  });
});

describe("escenario 'nos quedamos en casa' en Fin de año", () => {
  it("marcar omitida el viaje baja el gasto; desmarcar lo devuelve", () => {
    const viaje = { id: "v", nombre: "Viaje", omitida: false, items: [item(9000)] };
    const p = presupuesto({
      ingresos: [ingreso(20000)],
      secciones: [seccion({ subsecciones: [viaje, { id: "c", nombre: "Comida", items: [item(3000)] }] })],
    });
    expect(totales(p).balance).toBe(8000);
    viaje.omitida = true;
    expect(totales(p).balance).toBe(17000);
    viaje.omitida = false;
    expect(totales(p).balance).toBe(8000);
  });
});

describe("ingresos", () => {
  const a = ingreso(100, { nombre: "A", fecha: "2026-12-28", persona: "yo" });
  const b = ingreso(50, { nombre: "B", fecha: "2026-12-05", persona: "esposa" });
  const c = ingreso(25, { nombre: "C", fecha: "", persona: "yo" });
  const d = ingreso(10, { nombre: "D", fecha: "2026-12-05", persona: "esposa" });

  it("totalPorPersona separa yo / esposa", () => {
    expect(totalPorPersona([a, b, c, d], "yo")).toBe(125);
    expect(totalPorPersona([a, b, c, d], "esposa")).toBe(60);
  });
  it("totalPorPersona de una persona sin ingresos es 0", () => {
    expect(totalPorPersona([a], "esposa")).toBe(0);
  });
  it("el total de ingresos cuenta a ambos", () => {
    expect(totales(presupuesto({ ingresos: [a, b, c, d] })).ingresos).toBe(185);
  });
  it("cronograma ordena por fecha y deja los sin fecha al final", () => {
    expect(cronograma([a, b, c, d]).map((x) => x.ingreso.nombre)).toEqual(["B", "D", "A", "C"]);
  });
  it("cronograma mantiene el orden de carga cuando la fecha es igual", () => {
    expect(cronograma([d, b]).map((x) => x.ingreso.nombre)).toEqual(["D", "B"]);
  });
  it("el acumulado crece en el orden del cronograma", () => {
    expect(cronograma([a, b, c, d]).map((x) => x.acumulado)).toEqual([50, 60, 160, 185]);
  });
  it("cronograma vacío", () => {
    expect(cronograma([])).toEqual([]);
  });
  it("no modifica el arreglo original", () => {
    const orig = [a, b];
    cronograma(orig);
    expect(orig).toEqual([a, b]);
  });
  it("agregar, editar y quitar un ingreso se refleja en el total", () => {
    const lista = [ingreso(100)];
    expect(totales(presupuesto({ ingresos: lista })).ingresos).toBe(100);
    lista.push(ingreso(40));
    expect(totales(presupuesto({ ingresos: lista })).ingresos).toBe(140);
    lista[0].monto = 200;
    expect(totales(presupuesto({ ingresos: lista })).ingresos).toBe(240);
    lista.pop();
    expect(totales(presupuesto({ ingresos: lista })).ingresos).toBe(200);
  });
});

// Intl separa el símbolo del número con un espacio no cortable (U+00A0).
const f = (n: number) => formatoMoneda(n).replace(/\u00a0/g, " ");

describe("formatoMoneda (UYU)", () => {
  it("usa punto de miles y símbolo $", () => {
    expect(f(1234567)).toBe("$ 1.234.567");
  });
  it("cero y negativos", () => {
    expect(f(0)).toBe("$ 0");
    expect(f(-1500)).toBe("-$ 1.500");
  });
  it("sin decimales", () => {
    expect(f(10.4)).toBe("$ 10");
  });
});
