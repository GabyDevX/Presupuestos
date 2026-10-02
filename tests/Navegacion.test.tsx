// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Presupuestos from "@/components/Presupuestos";
import { crearSeed } from "@/lib/seed";
import { presupuesto, seccion } from "./helpers";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.documentElement.className = "dark";
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ rev: 1 }), { status: 200 })));
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const montar = (hash = "", p = crearSeed()) => {
  window.history.replaceState(null, "", "/" + hash);
  const user = userEvent.setup();
  render(<Presupuestos inicial={p} />);
  return user;
};
const titulo = () => screen.getByRole("heading", { level: 1 }).textContent;
const irA = (user: ReturnType<typeof userEvent.setup>, tab: string) =>
  user.click(screen.getAllByRole("button", { name: tab })[0]);

describe("navegación entre pantallas", () => {
  it("abre en Resumen", () => {
    montar();
    expect(titulo()).toBe("Resumen");
  });
  it("las cuatro pestañas están en la barra, y se puede ir a cada una", async () => {
    const user = montar();
    for (const tab of ["Gastos", "Ingresos", "Ajustes", "Resumen"]) {
      await irA(user, tab);
      expect(titulo()).toBe(tab);
    }
  });
  it("hay como máximo 5 destinos principales (barra inferior)", () => {
    montar();
    const barra = screen.getAllByRole("navigation", { name: "Principal" }).at(-1)!;
    expect(within(barra).getAllByRole("button").length).toBeLessThanOrEqual(5);
  });
  it("la pestaña activa se marca con aria-current", async () => {
    const user = montar();
    expect(screen.getAllByRole("button", { name: "Resumen" })[0]).toHaveAttribute("aria-current", "page");
    await irA(user, "Gastos");
    expect(screen.getAllByRole("button", { name: "Gastos" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("button", { name: "Resumen" })[0]).not.toHaveAttribute("aria-current");
  });
  it("un link directo abre la pantalla correcta", () => {
    montar("#/ingresos");
    expect(titulo()).toBe("Ingresos");
  });
  it("un link directo a una sección abre su detalle", () => {
    const p = crearSeed();
    montar(`#/gastos/${p.secciones[2].id}`, p);
    expect(titulo()).toBe("Navidad");
    expect(screen.getByRole("button", { name: "Volver a Gastos" })).toBeInTheDocument();
  });
  it("un link a una sección que ya no existe muestra la lista de Gastos", () => {
    montar("#/gastos/no-existe");
    expect(titulo()).toBe("Gastos");
  });
  it("tocar una categoría la abre y el hash cambia (se puede compartir)", async () => {
    const p = crearSeed();
    const user = montar("", p);
    await user.click(screen.getByRole("button", { name: /Navidad/ }));
    expect(titulo()).toBe("Navidad");
    expect(window.location.hash).toBe(`#/gastos/${p.secciones[2].id}`);
  });
  it("'Volver' regresa a la lista de Gastos", async () => {
    const user = montar();
    await user.click(screen.getByRole("button", { name: /Navidad/ }));
    await user.click(screen.getByRole("button", { name: "Volver a Gastos" }));
    expect(titulo()).toBe("Gastos");
  });
  it("el botón atrás del navegador vuelve a la pantalla anterior", async () => {
    const user = montar();
    await irA(user, "Ingresos");
    expect(titulo()).toBe("Ingresos");
    window.history.replaceState(null, "", "/#/");
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(titulo()).toBe("Resumen");
  });
  it("en el detalle, la pestaña Gastos sigue activa", async () => {
    const user = montar();
    await user.click(screen.getByRole("button", { name: /Navidad/ }));
    expect(screen.getAllByRole("button", { name: "Gastos" })[0]).toHaveAttribute("aria-current", "page");
  });
  it("'Ver todos' en Resumen lleva a Ingresos", async () => {
    const user = montar();
    await user.click(screen.getByRole("button", { name: "Ver todos" }));
    expect(titulo()).toBe("Ingresos");
  });
  it("el balance se ve en todas las pantallas", async () => {
    const user = montar();
    for (const tab of ["Gastos", "Ingresos", "Ajustes"]) {
      await irA(user, tab);
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.getByTestId("balance-monto")).toHaveTextContent("$ 73.400");
    }
  });
  it("los cambios se conservan al cambiar de pantalla", async () => {
    const user = montar();
    await user.click(screen.getByRole("button", { name: /Navidad/ }));
    await user.type(screen.getByLabelText("Presupuesto general de Regalos"), "1000");
    await irA(user, "Resumen");
    expect(screen.getByTestId("balance-monto")).toHaveTextContent("$ 57.400"); // 73.400 - 16.000
  });
});

describe("Resumen", () => {
  it("muestra el balance como frase y los totales", () => {
    montar();
    expect(screen.getByRole("heading", { name: /Nos sobran/ })).toHaveTextContent("$ 73.400");
    expect(screen.getByText("Planificado: 34% de los ingresos.")).toBeInTheDocument();
  });
  it("cuando falta plata dice 'Nos faltan'", () => {
    const p = presupuesto({ secciones: [seccion({ items: [{ id: "i", nombre: "x", monto: 500, pagado: false }] })] });
    montar("", p);
    expect(screen.getByRole("heading", { name: /Nos faltan/ })).toHaveTextContent("$ 500");
  });
  it("sin datos invita a cargarlos", () => {
    montar("", presupuesto());
    expect(screen.getByText("Cargá los ingresos y los gastos para ver el balance.")).toBeInTheDocument();
  });
  it("lista los próximos cobros con fecha corta", () => {
    montar();
    expect(screen.getAllByText("15 dic")).toHaveLength(2);
    expect(screen.getAllByText("15 ene")).toHaveLength(2);
  });
  it("cada categoría muestra su ícono dibujado, no un emoji", () => {
    montar();
    const fila = screen.getByRole("button", { name: /Navidad/ });
    expect(fila.querySelector("svg")).toBeTruthy();
    expect(fila.textContent).not.toMatch(/🎄/);
  });
});

describe("Gastos", () => {
  it("cada categoría muestra pagado y pendiente", () => {
    montar("#/gastos");
    const fila = screen.getByRole("button", { name: /Auto/ });
    expect(fila.textContent?.replace(/ /g, " ")).toContain("Pagado $ 0 · Pendiente $ 25.500");
  });
  it("agregar una sección abre su detalle listo para completar", async () => {
    const user = montar("#/gastos");
    await user.click(screen.getByRole("button", { name: "Agregar sección" }));
    expect(titulo()).toBe("Nueva sección");
  });
  it("el ícono de una sección se puede cambiar", async () => {
    const user = montar("#/gastos", presupuesto({ secciones: [seccion({ nombre: "Otra", emoji: "📌" })] }));
    await user.click(screen.getByRole("button", { name: /Otra/ }));
    await user.click(screen.getByRole("button", { name: "Editar sección" }));
    const auto = screen.getByRole("button", { name: "Ícono 🚗" });
    expect(auto).toHaveAttribute("aria-pressed", "false");
    await user.click(auto);
    expect(auto).toHaveAttribute("aria-pressed", "true");
  });
  it("'Editar sección' alterna con 'Listo' y oculta los controles de estructura", async () => {
    const user = montar();
    await user.click(screen.getByRole("button", { name: /Navidad/ }));
    expect(screen.queryByTitle("Eliminar sección")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Eliminar subsección")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar sección" }));
    expect(screen.getByTitle("Eliminar sección")).toBeInTheDocument();
    expect(screen.getAllByTitle("Eliminar subsección").length).toBe(4);
    await user.click(screen.getByRole("button", { name: "Listo" }));
    expect(screen.queryByTitle("Eliminar sección")).not.toBeInTheDocument();
  });
});

describe("Ajustes y tema", () => {
  it("por defecto el tema es oscuro", async () => {
    montar("#/ajustes");
    expect(await screen.findByRole("radio", { name: "Oscuro" })).toHaveAttribute("aria-checked", "true");
  });
  it("cambiar a Claro aplica la clase, lo recuerda y se puede volver", async () => {
    const user = montar("#/ajustes");
    await user.click(screen.getByRole("radio", { name: "Claro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("tema")).toBe("claro");
    expect(screen.getByRole("radio", { name: "Claro" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Oscuro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("tema")).toBe("oscuro");
  });
  it("recuerda el tema guardado al volver a Ajustes", async () => {
    localStorage.setItem("tema", "claro");
    montar("#/ajustes");
    expect(await screen.findByRole("radio", { name: "Claro" })).toHaveAttribute("aria-checked", "true");
  });
  it("'Sistema' sigue la preferencia del dispositivo", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("dark") ? false : true, media: q }));
    const user = montar("#/ajustes");
    await user.click(screen.getByRole("radio", { name: "Sistema" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
  it("si el almacenamiento falla, igual se aplica el tema", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("privado"); });
    const user = montar("#/ajustes");
    await user.click(screen.getByRole("radio", { name: "Claro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("accesibilidad básica", () => {
  it("los botones de solo ícono tienen nombre accesible", () => {
    montar(`#/gastos/${crearSeed().secciones[2].id}`);
    for (const b of screen.getAllByRole("button")) {
      expect((b.getAttribute("aria-label") ?? b.textContent ?? "").trim().length).toBeGreaterThan(0);
    }
  });
  it("los íconos decorativos están ocultos para lectores de pantalla", () => {
    montar();
    for (const svg of document.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");
  });
  it("cada campo de monto tiene etiqueta", () => {
    montar(`#/gastos/${crearSeed().secciones[0].id}`);
    for (const i of document.querySelectorAll('input[type="number"]')) expect(i).toHaveAttribute("aria-label");
  });
  it("hay un solo h1 por pantalla", async () => {
    const user = montar();
    for (const tab of ["Gastos", "Ingresos", "Ajustes"]) {
      await irA(user, tab);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    }
  });
});
