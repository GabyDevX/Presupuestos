import { beforeEach, describe, expect, it } from "vitest";
import { crear, eliminar, guardarVersion, listar, obtener } from "@/lib/presupuestos";
import { reiniciarMemoria, sembrarLegacy } from "@/lib/store";
import { crearSeed } from "@/lib/seed";
import { presupuesto } from "./helpers";

beforeEach(() => reiniciarMemoria());

describe("primera vez", () => {
  it("crea el presupuesto inicial con los datos iniciales", async () => {
    const l = await listar();
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ id: "inicial", nombre: "Fin de año 2026", balance: 73400 });
  });
  it("es idempotente: llamar varias veces no duplica", async () => {
    await listar();
    await listar();
    await obtener("inicial");
    expect(await listar()).toHaveLength(1);
  });
});

describe("datos de la versión anterior (un único presupuesto)", () => {
  it("se conservan como el presupuesto inicial, con los cambios que ya se guardaron", async () => {
    const previo: any = { ...crearSeed(), rev: 7 };
    delete previo.nombre;
    previo.ingresos[0].monto = 99999;
    sembrarLegacy(previo);
    const d = await obtener("inicial");
    expect(d).toMatchObject({ nombre: "Fin de año 2026", rev: 7 });
    expect(d!.ingresos[0].monto).toBe(99999);
  });
  it("después de migrar, se puede seguir guardando sobre la misma versión", async () => {
    sembrarLegacy({ ...crearSeed(), rev: 3 });
    const d = (await obtener("inicial"))!;
    expect(await guardarVersion("inicial", { ...d, nombre: "Renombrado" })).toEqual({ tipo: "ok", rev: 4 });
  });
});

describe("servicio", () => {
  it("crear en blanco suma a la lista, en orden", async () => {
    await crear("Segundo", { tipo: "blanco" });
    expect((await listar()).map((x) => x.nombre)).toEqual(["Fin de año 2026", "Segundo"]);
  });
  it("duplicar un id inexistente devuelve null y no crea nada", async () => {
    expect(await crear("x", { tipo: "duplicar", id: "nada" })).toBeNull();
    expect(await listar()).toHaveLength(1);
  });
  it("la lista refleja renombres y archivados", async () => {
    const d = (await obtener("inicial"))!;
    await guardarVersion("inicial", { ...d, nombre: "Nuevo nombre", archivado: true });
    expect((await listar())[0]).toMatchObject({ nombre: "Nuevo nombre", archivado: true });
  });
  it("la lista muestra el balance de cada uno", async () => {
    const { id } = (await crear("Chico", { tipo: "blanco" }))!;
    const d = (await obtener(id))!;
    await guardarVersion(id, { ...d, ingresos: [{ id: "i", nombre: "x", persona: "yo", fecha: "", monto: 500 }] });
    expect((await listar()).find((x) => x.id === id)).toMatchObject({ ingresos: 500, balance: 500 });
  });
  it("guardar en uno inexistente da 'noexiste'", async () => {
    expect(await guardarVersion("nada", presupuesto())).toEqual({ tipo: "noexiste" });
  });
  it("eliminar devuelve false si no existe", async () => {
    expect(await eliminar("nada")).toBe(false);
  });
});
