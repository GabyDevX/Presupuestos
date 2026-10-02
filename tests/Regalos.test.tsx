// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Presupuestos from "@/components/Presupuestos";
import { crearSeed } from "@/lib/seed";

const norm = (s: string | null) => (s ?? "").replace(/ /g, " ").trim();
const status = () => screen.getAllByRole("status")[0];
const valor = (label: string) =>
  norm(within(status()).getByText(label, { selector: "dt" }).nextElementSibling!.textContent);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ rev: 1 }), { status: 200 })));
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const montar = async () => {
  const user = userEvent.setup();
  render(<Presupuestos inicial={crearSeed()} />);
  await user.click(screen.getByRole("button", { name: /Navidad/ }));
  return user;
};
const poner = async (user: ReturnType<typeof userEvent.setup>, el: HTMLElement, n: number) => {
  await user.clear(el);
  await user.type(el, String(n));
};
const general = () => screen.getByLabelText("Presupuesto general de Regalos");
const monto = (persona: string) => screen.getByLabelText(`Monto de ${persona}`);

describe("lista de regalos de Navidad (UI)", () => {
  it("muestra las 16 personas", async () => {
    await montar();
    expect(screen.getByLabelText("Monto de Ronald")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto de Gabriel")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Monto de /).length).toBeGreaterThanOrEqual(16);
  });
  it("al inicio todo está en 0 salvo patente y seguro", async () => {
    await montar();
    expect(valor("Gastos")).toBe("$ 38.500");
    expect(valor("Ingresos")).toBe("$ 111.900");
    expect(valor("Pagado")).toBe("$ 0");
  });
  it("el presupuesto general se aplica a las 16 personas", async () => {
    const user = await montar();
    await poner(user, general(), 1000);
    expect(valor("Gastos")).toBe(`$ ${(38500 + 16000).toLocaleString("es-UY")}`);
    expect(monto("Ronald")).toHaveValue(1000);
    expect(monto("Gabriel")).toHaveValue(1000);
  });
  it("editar el regalo de una persona cambia solo ese y el total", async () => {
    const user = await montar();
    await poner(user, general(), 1000);
    await poner(user, monto("Sofia"), 3500);
    expect(monto("Sofia")).toHaveValue(3500);
    expect(monto("Ronald")).toHaveValue(1000);
    expect(valor("Gastos")).toBe("$ 57.000"); // 38.500 + 15*1000 + 3.500
  });
  it("si cambia el general, el editado a mano se mantiene", async () => {
    const user = await montar();
    await poner(user, general(), 1000);
    await poner(user, monto("Sofia"), 3500);
    await poner(user, general(), 2000);
    expect(monto("Sofia")).toHaveValue(3500);
    expect(monto("Ronald")).toHaveValue(2000);
    expect(valor("Gastos")).toBe("$ 72.000"); // 38.500 + 15*2000 + 3.500
  });
  it("el botón ↺ devuelve a la persona al presupuesto general", async () => {
    const user = await montar();
    await poner(user, general(), 1000);
    await poner(user, monto("Sofia"), 3500);
    const fila = monto("Sofia").closest("li")!;
    await user.click(within(fila).getByTitle("Volver al presupuesto general"));
    expect(monto("Sofia")).toHaveValue(1000);
    expect(within(fila).queryByTitle("Volver al presupuesto general")).not.toBeInTheDocument();
    expect(valor("Gastos")).toBe("$ 54.500");
  });
  it("las personas sin editar no muestran el botón ↺", async () => {
    await montar();
    expect(screen.queryByTitle("Volver al presupuesto general")).not.toBeInTheDocument();
  });
  it("marcar a una persona como comprada mueve su monto a pagado", async () => {
    const user = await montar();
    await poner(user, general(), 1000);
    await user.click(screen.getByLabelText('Marcar "Nene" como pagado'));
    expect(valor("Pagado")).toBe("$ 1.000");
    expect(valor("Pendiente")).toBe("$ 53.500");
  });
  it("agregar una persona nueva la suma con el presupuesto general", async () => {
    const user = await montar();
    await poner(user, general(), 1000);
    await user.click(screen.getByRole("button", { name: "+ Agregar persona" }));
    const nombre = screen.getAllByPlaceholderText("Nombre del ítem").at(-1)!;
    await user.type(nombre, "Tía Rosa");
    expect(monto("Tía Rosa")).toHaveValue(1000);
    expect(valor("Gastos")).toBe("$ 55.500");
  });
  it("eliminar una persona la saca del total", async () => {
    const user = await montar();
    await poner(user, general(), 1000);
    const fila = monto("Pamela").closest("li")!;
    await user.click(within(fila).getByTitle("Eliminar ítem"));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Pamela"));
    expect(valor("Gastos")).toBe("$ 53.500");
  });
  it("muestra el subtotal de la lista", async () => {
    const user = await montar();
    await poner(user, general(), 500);
    expect(norm(screen.getByText(/16 ítems · Subtotal/).textContent)).toContain("$ 8.000");
  });
});

describe("personas y notas", () => {
  it("los ingresos muestran a Gabriel y Camila (no 'yo' / 'esposa')", () => {
    render(<Presupuestos inicial={crearSeed()} />);
    expect(screen.getAllByText("Gabriel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Camila").length).toBeGreaterThan(0);
    expect(screen.queryByText("Yo")).not.toBeInTheDocument();
    expect(screen.queryByText("Esposa")).not.toBeInTheDocument();
  });
  it("totales por persona: Gabriel 87.000 y Camila 24.900", () => {
    render(<Presupuestos inicial={crearSeed()} />);
    expect(norm(screen.getByText("Gabriel", { selector: "div" }).parentElement!.textContent)).toContain("$ 87.000");
    expect(norm(screen.getByText("Camila", { selector: "div" }).parentElement!.textContent)).toContain("$ 24.900");
  });
  it("el cronograma muestra el acumulado final de 111.900", () => {
    render(<Presupuestos inicial={crearSeed()} />);
    const acumulados = screen.getAllByText(/Acumulado hasta acá/).map((e) => norm(e.textContent));
    expect(acumulados.at(-1)).toContain("$ 111.900");
  });
  it("la nota de vacaciones (van los 4) es editable", async () => {
    const user = userEvent.setup();
    render(<Presupuestos inicial={crearSeed()} />);
    await user.click(screen.getByRole("button", { name: /Vacaciones/ }));
    const nota = screen.getByLabelText("Notas de Vacaciones (enero)");
    expect(nota).toHaveValue("Destino por definir. Vamos los 4: Gabriel, Camila, Amelia y Manuel.");
    await user.type(nota, " Quizás sierras.");
    expect((nota as HTMLTextAreaElement).value).toContain("Quizás sierras.");
  });
  it("cumpleaños: cada uno tiene sus ítems propios y suman al total", async () => {
    const user = userEvent.setup();
    render(<Presupuestos inicial={crearSeed()} />);
    await user.click(screen.getByRole("button", { name: /Cumpleaños de enero/ }));
    expect(screen.getByDisplayValue("Amelia — 4 de enero")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Manuel — 6 de enero")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cumpleaños compartido — fecha por definir")).toBeInTheDocument();
    const torta = screen.getAllByLabelText("Monto de Torta");
    expect(torta).toHaveLength(3);
    await user.type(torta[0], "1800");
    await user.type(torta[1], "1500");
    await user.type(torta[2], "3000");
    expect(valor("Gastos")).toBe("$ 44.800");
  });
  it("no hay banner de ejemplos con los datos reales", () => {
    render(<Presupuestos inicial={crearSeed()} />);
    expect(screen.queryByRole("button", { name: "Borrar ejemplos" })).not.toBeInTheDocument();
  });
});
