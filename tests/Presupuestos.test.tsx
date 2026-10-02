// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Presupuestos from "@/components/Presupuestos";
import type { Presupuesto } from "@/lib/types";
import { destino, ingreso, item, presupuesto, seccion, seed } from "./helpers";

const norm = (s: string | null) => (s ?? "").replace(/ /g, " ").trim();

// El resumen se renderiza dos veces (celular y computadora); tomamos el primero.
const status = () => screen.getAllByRole("status")[0];
const valor = (label: string) =>
  norm(within(status()).getByText(label, { selector: "dt" }).nextElementSibling!.textContent);
const balance = () => ({
  texto: norm(status().querySelector("span")!.textContent), // "Nos sobra" / "Nos falta"
  monto: norm(status().querySelector(".text-3xl")!.textContent),
  rojo: status().className.includes("bg-rose-600"),
  verde: status().className.includes("bg-emerald-600"),
});

type Llamada = { url: string; method: string; body?: Presupuesto };
let llamadas: Llamada[];
let respuestaPut: () => Promise<Response>;
let respuestaGet: () => Promise<Response>;

const ok = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

beforeEach(() => {
  llamadas = [];
  let rev = 0;
  respuestaPut = () => ok({ rev: ++rev });
  respuestaGet = () => ok({ data: presupuesto({ rev: 0 }) });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      llamadas.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return method === "PUT" ? respuestaPut() : respuestaGet();
    }),
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => vi.unstubAllGlobals());

const puts = () => llamadas.filter((l) => l.method === "PUT");
const montar = (p: Presupuesto = seed()) => {
  const user = userEvent.setup();
  render(<Presupuestos inicial={p} />);
  return user;
};
const abrir = (user: ReturnType<typeof userEvent.setup>, nombre: RegExp) =>
  user.click(screen.getByRole("button", { name: nombre }));
const poner = async (user: ReturnType<typeof userEvent.setup>, el: HTMLElement, n: number) => {
  await user.clear(el);
  await user.type(el, String(n));
};

describe("resumen inicial", () => {
  it("muestra los totales del ejemplo y 'Nos sobra' en verde", () => {
    montar();
    expect(valor("Ingresos")).toBe("$ 160.000");
    expect(valor("Gastos")).toBe("$ 76.700");
    expect(valor("Pagado")).toBe("$ 1.200");
    expect(valor("Pendiente")).toBe("$ 75.500");
    expect(balance()).toMatchObject({ texto: "Nos sobra", monto: "$ 83.300", verde: true, rojo: false });
  });
  it("las categorías muestran su subtotal sin abrirlas", () => {
    montar();
    expect(norm(screen.getByRole("button", { name: /Navidad/ }).textContent)).toContain("$ 12.700");
    expect(norm(screen.getByRole("button", { name: /Vacaciones/ }).textContent)).toContain("$ 44.000");
  });
  it("el título 'Presupuesto de fin de año' y el aviso de ejemplos están visibles", () => {
    montar();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Presupuesto de fin de año");
    expect(screen.getByText(/datos de/i)).toBeInTheDocument();
  });
  it("sin ingresos ni gastos: 'Nos sobra $ 0' y estados vacíos amigables", () => {
    montar(presupuesto());
    expect(balance()).toMatchObject({ texto: "Nos sobra", monto: "$ 0", verde: true });
    expect(screen.getByText(/Todavía no cargaste ingresos/)).toBeInTheDocument();
    expect(screen.getByText(/No hay secciones/)).toBeInTheDocument();
  });
});

describe("marcar pagado", () => {
  it("mueve el monto de pendiente a pagado sin cambiar gastos ni balance", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    expect(valor("Pagado")).toBe("$ 3.700");
    expect(valor("Pendiente")).toBe("$ 73.000");
    expect(valor("Gastos")).toBe("$ 76.700");
    expect(balance().monto).toBe("$ 83.300");
  });
  it("desmarcar lo devuelve a pendiente", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Luces del arbolito (ejemplo)" como pagado'));
    expect(valor("Pagado")).toBe("$ 0");
    expect(valor("Pendiente")).toBe("$ 76.700");
  });
  it("el subtotal de la categoría muestra pagado y pendiente", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    expect(norm(screen.getByRole("button", { name: /Navidad/ }).textContent)).toMatch(/Pagado \$ 3\.700 · Pendiente \$ 9\.000/);
  });
});

describe("editar montos", () => {
  it("cambiar el monto de un ítem actualiza gastos y balance", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await poner(user, screen.getByLabelText("Monto de Regalo para la abuela (ejemplo)"), 5000);
    expect(valor("Gastos")).toBe("$ 79.200");
    expect(balance().monto).toBe("$ 80.800");
  });
  it("vaciar el monto lo cuenta como 0", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.clear(screen.getByLabelText("Monto de Regalo para la abuela (ejemplo)"));
    expect(valor("Gastos")).toBe("$ 74.200");
  });
  it("cargar el patente y el seguro (ítems fijos) suma a Auto y Casa", async () => {
    const user = montar();
    await abrir(user, /Auto/);
    await poner(user, screen.getByLabelText("Monto de Patente"), 4500);
    await abrir(user, /Casa/);
    await poner(user, screen.getByLabelText(/Monto de Seguro de la casa/), 12000);
    expect(valor("Gastos")).toBe("$ 93.200");
    expect(valor("Pendiente")).toBe("$ 92.000");
  });
  it("un monto negativo escrito se corrige a 0", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    const input = screen.getByLabelText("Monto de Regalo para la abuela (ejemplo)");
    await user.clear(input);
    await user.type(input, "-50");
    expect(valor("Gastos")).not.toContain("-");
  });
});

describe("balance en rojo", () => {
  it("cuando los gastos superan los ingresos dice 'Nos falta' en rojo", () => {
    montar(presupuesto({ ingresos: [ingreso(1000)], secciones: [seccion({ items: [item(2500)] })] }));
    expect(balance()).toMatchObject({ texto: "Nos falta", monto: "$ 1.500", rojo: true, verde: false });
  });
  it("cruza de verde a rojo al aumentar un gasto", async () => {
    const it = item(500, { nombre: "Cena" });
    const user = montar(presupuesto({ ingresos: [ingreso(1000)], secciones: [seccion({ nombre: "Comidas", items: [it] })] }));
    expect(balance().verde).toBe(true);
    await abrir(user, /Comidas/);
    await poner(user, screen.getByLabelText("Monto de Cena"), 1500);
    expect(balance()).toMatchObject({ texto: "Nos falta", monto: "$ 500", rojo: true });
  });
  it("gastos == ingresos: balance 0 y en verde", () => {
    montar(presupuesto({ ingresos: [ingreso(1000)], secciones: [seccion({ items: [item(1000)] })] }));
    expect(balance()).toMatchObject({ texto: "Nos sobra", monto: "$ 0", verde: true });
  });
});

describe("comparador de destinos", () => {
  it("elegir otro destino suma su total y baja el balance", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    await user.click(screen.getByLabelText("Seleccionar Casa de familiares en el interior (ejemplo)"));
    expect(valor("Gastos")).toBe("$ 92.700");
    expect(balance().monto).toBe("$ 67.300");
  });
  it("deseleccionar el destino elegido baja los gastos", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    await user.click(screen.getByLabelText("Seleccionar Playa cercana (ejemplo)"));
    expect(valor("Gastos")).toBe("$ 32.700");
    expect(balance().monto).toBe("$ 127.300");
  });
  it("sin destinos elegidos vacaciones no pesa", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    await user.click(screen.getByLabelText("Seleccionar Playa cercana (ejemplo)"));
    expect(norm(screen.getByRole("button", { name: /Vacaciones/ }).textContent)).toContain("$ 0");
  });
  it("cada destino muestra su total y el balance si fuera el único", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    const tarjeta = screen.getByLabelText("Seleccionar Casa de familiares en el interior (ejemplo)").closest("div.rounded-xl")!;
    const t = norm(tarjeta.textContent);
    expect(t).toContain("$ 16.000");
    expect(t).toContain("$ 111.300"); // 127.300 sin destinos - 16.000
  });
  it("editar un costo del destino elegido actualiza el resumen", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    await poner(user, screen.getByLabelText("Estadía de Playa cercana (ejemplo)"), 30000);
    expect(valor("Gastos")).toBe("$ 81.700");
  });
  it("editar un costo de un destino NO elegido no cambia el resumen", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    await poner(user, screen.getByLabelText("Estadía de Casa de familiares en el interior (ejemplo)"), 99999);
    expect(valor("Gastos")).toBe("$ 76.700");
  });
  it("agregar un destino nuevo, completarlo y elegirlo", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    await user.click(screen.getByRole("button", { name: "+ Agregar destino" }));
    const nombre = screen.getAllByPlaceholderText("Nombre del lugar").at(-1)!;
    await user.type(nombre, "Montañas");
    await poner(user, screen.getByLabelText("Transporte / viaje de Montañas"), 1000);
    await user.click(screen.getByLabelText("Seleccionar Montañas"));
    expect(valor("Gastos")).toBe("$ 77.700");
  });
  it("eliminar un destino elegido (con confirmación) lo saca del total", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    const tarjeta = screen.getByLabelText("Seleccionar Playa cercana (ejemplo)").closest("div.rounded-xl")!;
    await user.click(within(tarjeta as HTMLElement).getByTitle("Eliminar destino"));
    expect(window.confirm).toHaveBeenCalled();
    expect(valor("Gastos")).toBe("$ 32.700");
  });
  it("si cancelás la confirmación el destino se queda", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = montar();
    await abrir(user, /Vacaciones/);
    const tarjeta = screen.getByLabelText("Seleccionar Playa cercana (ejemplo)").closest("div.rounded-xl")!;
    await user.click(within(tarjeta as HTMLElement).getByTitle("Eliminar destino"));
    expect(valor("Gastos")).toBe("$ 76.700");
  });
  it("sin destinos muestra un estado vacío", async () => {
    const p = seed();
    p.destinos = [];
    const user = montar(p);
    await abrir(user, /Vacaciones/);
    expect(screen.getByText(/Todavía no hay destinos/)).toBeInTheDocument();
  });
});

describe("Fin de año: nos quedamos en casa", () => {
  const conViaje = () =>
    presupuesto({
      ingresos: [ingreso(20000)],
      secciones: [
        seccion({
          nombre: "Fin de año",
          subsecciones: [
            { id: "v", nombre: "Viaje", omitirTexto: "Nos quedamos en casa", items: [item(9000, { nombre: "Pasajes" })] },
            { id: "c", nombre: "Comida", items: [item(3000, { nombre: "Cena" })] },
          ],
        }),
      ],
    });

  it("marcar 'nos quedamos en casa' saca el viaje del presupuesto", async () => {
    const user = montar(conViaje());
    expect(valor("Gastos")).toBe("$ 12.000");
    await abrir(user, /Fin de año/);
    await user.click(screen.getByLabelText("Nos quedamos en casa"));
    expect(valor("Gastos")).toBe("$ 3.000");
    expect(balance().monto).toBe("$ 17.000");
  });
  it("desmarcarlo lo devuelve", async () => {
    const user = montar(conViaje());
    await abrir(user, /Fin de año/);
    await user.click(screen.getByLabelText("Nos quedamos en casa"));
    await user.click(screen.getByLabelText("Nos quedamos en casa"));
    expect(valor("Gastos")).toBe("$ 12.000");
  });
});

describe("borrar datos de ejemplo", () => {
  it("deja todo en cero, conserva las categorías y oculta el aviso", async () => {
    const user = montar();
    await user.click(screen.getByRole("button", { name: "Borrar ejemplos" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(valor("Ingresos")).toBe("$ 0");
    expect(valor("Gastos")).toBe("$ 0");
    expect(screen.queryByRole("button", { name: "Borrar ejemplos" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Navidad/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cumpleaños/ })).toBeInTheDocument();
  });
  it("si cancelás, no se borra nada", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = montar();
    await user.click(screen.getByRole("button", { name: "Borrar ejemplos" }));
    expect(valor("Gastos")).toBe("$ 76.700");
    expect(screen.getByRole("button", { name: "Borrar ejemplos" })).toBeInTheDocument();
  });
  it("los datos propios sobreviven", async () => {
    const user = montar();
    await user.click(screen.getByRole("button", { name: "+ Agregar ingreso" }));
    await poner(user, screen.getByLabelText(/^Monto de$/), 700);
    await user.click(screen.getByRole("button", { name: "Borrar ejemplos" }));
    expect(valor("Ingresos")).toBe("$ 700");
  });
});

describe("ingresos", () => {
  it("se muestran ordenados por fecha con el acumulado", () => {
    montar(
      presupuesto({
        ingresos: [
          ingreso(100, { nombre: "Tarde", fecha: "2027-01-10" }),
          ingreso(40, { nombre: "Temprano", fecha: "2026-12-01", persona: "esposa" }),
        ],
      }),
    );
    const nombres = screen.getAllByPlaceholderText(/Nombre \(ej\. Aguinaldo\)/).map((i) => (i as HTMLInputElement).value);
    expect(nombres).toEqual(["Temprano", "Tarde"]);
    const textos = screen.getAllByText(/Acumulado hasta acá/).map((e) => norm(e.textContent));
    expect(textos[0]).toContain("$ 40");
    expect(textos[1]).toContain("$ 140");
  });
  it("agregar un ingreso y ponerle monto actualiza el total y el balance", async () => {
    const user = montar(presupuesto());
    await user.click(screen.getByRole("button", { name: "+ Agregar ingreso" }));
    await poner(user, screen.getByLabelText(/^Monto de$/), 2500);
    expect(valor("Ingresos")).toBe("$ 2.500");
    expect(balance().monto).toBe("$ 2.500");
  });
  it("cambiar la persona mueve el monto entre 'Yo' y 'Esposa'", async () => {
    const user = montar(presupuesto({ ingresos: [ingreso(300, { nombre: "Aguinaldo" })] }));
    const resumenPersonas = () => norm(screen.getByText("Esposa", { selector: "div" }).parentElement!.textContent);
    expect(resumenPersonas()).toContain("$ 0");
    await user.selectOptions(screen.getByLabelText("Persona"), "esposa");
    expect(resumenPersonas()).toContain("$ 300");
    expect(valor("Ingresos")).toBe("$ 300");
  });
  it("eliminar un ingreso pide confirmación y descuenta del total", async () => {
    const user = montar(presupuesto({ ingresos: [ingreso(300, { nombre: "A" }), ingreso(200, { nombre: "B" })] }));
    await user.click(screen.getAllByTitle("Eliminar ingreso")[0]);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('"A"'));
    expect(valor("Ingresos")).toBe("$ 200");
  });
  it("cancelar la confirmación conserva el ingreso", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = montar(presupuesto({ ingresos: [ingreso(300)] }));
    await user.click(screen.getByTitle("Eliminar ingreso"));
    expect(valor("Ingresos")).toBe("$ 300");
  });
  it("cambiar la fecha reordena el cronograma", async () => {
    const user = montar(
      presupuesto({
        ingresos: [
          ingreso(1, { nombre: "Uno", fecha: "2026-12-01" }),
          ingreso(2, { nombre: "Dos", fecha: "2026-12-10" }),
        ],
      }),
    );
    const fechas = screen.getAllByLabelText("Fecha en que se recibe");
    await user.clear(fechas[0]);
    await user.type(fechas[0], "2026-12-20");
    const nombres = screen.getAllByPlaceholderText(/Nombre \(ej\./).map((i) => (i as HTMLInputElement).value);
    expect(nombres).toEqual(["Dos", "Uno"]);
  });
});

describe("ítems, secciones y subsecciones", () => {
  it("agregar un ítem y ponerle monto suma a la sección y al total", async () => {
    const user = montar(presupuesto({ secciones: [seccion({ nombre: "Extras" })] }));
    await abrir(user, /Extras/);
    expect(screen.getByText(/Todavía no hay ítems/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Agregar ítem" }));
    await user.type(screen.getByPlaceholderText("Nombre del ítem"), "Globos");
    await poner(user, screen.getByLabelText("Monto de Globos"), 350);
    expect(valor("Gastos")).toBe("$ 350");
    expect(norm(screen.getByRole("button", { name: /Extras/ }).textContent)).toContain("$ 350");
  });
  it("eliminar un ítem pide confirmación", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    const fila = screen.getByLabelText("Monto de Regalo para la abuela (ejemplo)").closest("li")!;
    await user.click(within(fila).getByTitle("Eliminar ítem"));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Regalo para la abuela"));
    expect(valor("Gastos")).toBe("$ 74.200");
  });
  it("cancelar no elimina el ítem", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = montar();
    await abrir(user, /Navidad/);
    const fila = screen.getByLabelText("Monto de Regalo para la abuela (ejemplo)").closest("li")!;
    await user.click(within(fila).getByTitle("Eliminar ítem"));
    expect(valor("Gastos")).toBe("$ 76.700");
  });
  it("los ítems fijos (patente, seguro) no se pueden eliminar", async () => {
    const user = montar();
    await abrir(user, /Auto/);
    const fila = screen.getByLabelText("Monto de Patente").closest("li")!;
    expect(within(fila).getByTitle("Eliminar ítem")).toBeDisabled();
  });
  it("agregar una sección nueva y eliminarla", async () => {
    const user = montar(presupuesto());
    await user.click(screen.getByRole("button", { name: "+ Agregar sección" }));
    expect(screen.getByRole("button", { name: /Nueva sección/ })).toBeInTheDocument();
    await abrir(user, /Nueva sección/);
    await user.click(screen.getByTitle("Eliminar sección"));
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Nueva sección/ })).not.toBeInTheDocument();
    expect(screen.getByText(/No hay secciones/)).toBeInTheDocument();
  });
  it("renombrar una sección", async () => {
    const user = montar(presupuesto({ secciones: [seccion({ nombre: "Vieja" })] }));
    await abrir(user, /Vieja/);
    const campo = screen.getByPlaceholderText("Nombre de la sección");
    await user.clear(campo);
    await user.type(campo, "Mascotas");
    expect(screen.getByRole("button", { name: /Mascotas/ })).toBeInTheDocument();
  });
  it("reordenar secciones con subir / bajar", async () => {
    const user = montar(presupuesto({ secciones: [seccion({ nombre: "Alfa" }), seccion({ nombre: "Beta" })] }));
    const orden = () => screen.getAllByRole("button", { expanded: false }).map((b) => b.textContent!.match(/Alfa|Beta/)?.[0]).filter(Boolean);
    expect(orden()).toEqual(["Alfa", "Beta"]);
    await abrir(user, /Beta/);
    await user.click(screen.getByTitle("Subir sección"));
    expect(screen.getAllByRole("button", { name: /Alfa|Beta/ }).map((b) => b.textContent!.match(/Alfa|Beta/)![0])).toEqual(["Beta", "Alfa"]);
  });
  it("no se puede subir la primera ni bajar la última", async () => {
    const user = montar(presupuesto({ secciones: [seccion({ nombre: "Alfa" })] }));
    await abrir(user, /Alfa/);
    expect(screen.getByTitle("Subir sección")).toBeDisabled();
    expect(screen.getByTitle("Bajar sección")).toBeDisabled();
  });
  it("agregar y eliminar una subsección con sus ítems", async () => {
    const user = montar(presupuesto({ secciones: [seccion({ nombre: "Casa", items: [] })] }));
    await abrir(user, /Casa/);
    await user.click(screen.getByRole("button", { name: "+ Agregar subsección" }));
    await user.type(screen.getByPlaceholderText("Nombre de la subsección"), "Cocina");
    await user.click(screen.getByRole("button", { name: "+ Agregar ítem" }));
    await user.type(screen.getByPlaceholderText("Nombre del ítem"), "Heladera");
    await poner(user, screen.getByLabelText("Monto de Heladera"), 800);
    expect(valor("Gastos")).toBe("$ 800");
    await user.click(screen.getByTitle("Eliminar subsección"));
    expect(valor("Gastos")).toBe("$ 0");
  });
  it("eliminar una sección con ítems descuenta sus gastos", async () => {
    const user = montar();
    await abrir(user, /Cumpleaños/);
    await user.click(screen.getByTitle("Eliminar sección"));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Cumpleaños"));
    expect(valor("Gastos")).toBe("$ 66.200");
  });
  it("eliminar la sección de vacaciones saca también los destinos elegidos del total", async () => {
    const user = montar();
    await abrir(user, /Vacaciones/);
    await user.click(screen.getByTitle("Eliminar sección"));
    expect(valor("Gastos")).toBe("$ 32.700");
  });
});

describe("guardado automático", () => {
  it("guarda con un pequeño retraso, enviando rev y el cambio", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    expect(screen.getAllByText("Guardando…").length).toBeGreaterThan(0);
    expect(puts()).toHaveLength(0);
    await waitFor(() => expect(puts()).toHaveLength(1), { timeout: 2500 });
    expect(puts()[0].body!.rev).toBe(0);
    expect(puts()[0].body!.secciones[2].subsecciones[0].items[0].pagado).toBe(true);
    await waitFor(() => expect(screen.getAllByText("✓ Guardado").length).toBeGreaterThan(0));
  });
  it("varios cambios seguidos se juntan en un solo guardado", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await poner(user, screen.getByLabelText("Monto de Regalo para la abuela (ejemplo)"), 1234);
    await waitFor(() => expect(puts()).toHaveLength(1), { timeout: 2500 });
    expect(puts()[0].body!.secciones[2].subsecciones[0].items[0].monto).toBe(1234);
  });
  it("el segundo guardado usa la rev que devolvió el primero", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    await waitFor(() => expect(puts()).toHaveLength(1), { timeout: 2500 });
    await waitFor(() => expect(screen.getAllByText("✓ Guardado").length).toBeGreaterThan(0));
    await user.click(screen.getByLabelText('Marcar "Regalo para los primos (ejemplo)" como pagado'));
    await waitFor(() => expect(puts()).toHaveLength(2), { timeout: 2500 });
    expect(puts()[1].body!.rev).toBe(1);
  });
  it("conflicto 409: carga la versión de la otra persona y avisa", async () => {
    const ajena = presupuesto({ rev: 7, ingresos: [ingreso(999, { nombre: "De mi esposa" })] });
    respuestaPut = () => ok({ error: "Conflicto", data: ajena }, 409);
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    await waitFor(() => expect(screen.getByText(/La otra persona había hecho cambios/)).toBeInTheDocument(), { timeout: 2500 });
    expect(valor("Ingresos")).toBe("$ 999");
    expect(screen.getByDisplayValue("De mi esposa")).toBeInTheDocument();
  });
  it("sin conexión: avisa y reintenta", async () => {
    let intento = 0;
    respuestaPut = () => (++intento === 1 ? Promise.reject(new Error("offline")) : ok({ rev: 1 }));
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    await waitFor(() => expect(screen.getAllByText(/Sin conexión/).length).toBeGreaterThan(0), { timeout: 2500 });
    await waitFor(() => expect(puts()).toHaveLength(2), { timeout: 7000 });
    await waitFor(() => expect(screen.getAllByText("✓ Guardado").length).toBeGreaterThan(0));
  }, 15000);
  it("error del servidor (500) también se muestra como error y no pierde el cambio local", async () => {
    respuestaPut = () => ok({ error: "x" }, 500);
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    await waitFor(() => expect(screen.getAllByText(/Sin conexión/).length).toBeGreaterThan(0), { timeout: 2500 });
    expect(valor("Pagado")).toBe("$ 3.700");
  });
});

describe("no perder cambios", () => {
  it("al ocultar la app (cambiar de app en el celular) guarda de inmediato", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    expect(puts()).toHaveLength(0);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0].body!.secciones[2].subsecciones[0].items[0].pagado).toBe(true);
  });
  it("ocultar la app sin cambios pendientes no guarda nada", () => {
    montar();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(puts()).toHaveLength(0);
  });
  it("al desmontar se cancelan los guardados pendientes (sin pedidos huérfanos)", async () => {
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    cleanup();
    await new Promise((r) => setTimeout(r, 900));
    expect(puts()).toHaveLength(0);
  });
});

describe("sincronización entre dos personas", () => {
  const visible = () => act(async () => { document.dispatchEvent(new Event("visibilitychange")); });

  it("al volver a la app trae una versión más nueva", async () => {
    const nueva = presupuesto({ rev: 3, ingresos: [ingreso(555)] });
    respuestaGet = () => ok({ data: nueva });
    montar();
    await visible();
    await waitFor(() => expect(valor("Ingresos")).toBe("$ 555"));
  });
  it("ignora una versión igual o más vieja", async () => {
    respuestaGet = () => ok({ data: presupuesto({ rev: 0, ingresos: [ingreso(1)] }) });
    montar();
    await visible();
    await new Promise((r) => setTimeout(r, 50));
    expect(valor("Ingresos")).toBe("$ 160.000");
  });
  it("no pisa cambios locales que todavía no se guardaron", async () => {
    respuestaGet = () => ok({ data: presupuesto({ rev: 9, ingresos: [ingreso(1)] }) });
    const user = montar();
    await abrir(user, /Navidad/);
    await user.click(screen.getByLabelText('Marcar "Regalo para la abuela (ejemplo)" como pagado'));
    await visible();
    await new Promise((r) => setTimeout(r, 50));
    expect(llamadas.filter((l) => l.method === "GET")).toHaveLength(0);
    expect(valor("Pagado")).toBe("$ 3.700");
  });
});

describe("salir", () => {
  it("llama al logout", async () => {
    const user = montar();
    Object.defineProperty(window, "location", { value: { href: "/" }, writable: true });
    await user.click(screen.getAllByRole("button", { name: "Salir" })[0]);
    expect(llamadas.some((l) => l.url === "/api/logout" && l.method === "POST")).toBe(true);
  });
});
