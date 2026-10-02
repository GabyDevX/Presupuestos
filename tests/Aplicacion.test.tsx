// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Aplicacion from "@/components/Aplicacion";
import type { ItemLista } from "@/lib/presupuestos";
import { crearSeed } from "@/lib/seed";
import { crearEnBlanco } from "@/lib/plantilla";

const norm = (s: string | null) => (s ?? "").replace(/ /g, " ").trim();
const item = (id: string, nombre: string, extra: Partial<ItemLista> = {}): ItemLista => ({
  id, nombre, archivado: false, ingresos: 1000, planificado: 400, balance: 600, ...extra,
});

type Llamada = { url: string; method: string; body?: any };
let llamadas: Llamada[];
let docs: Record<string, any>;
let lista: ItemLista[];
let siguiente = 0;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  llamadas = [];
  siguiente = 0;
  docs = { inicial: crearSeed() };
  lista = [item("inicial", "Fin de año 2026", { ingresos: 111900, planificado: 38500, balance: 73400 })];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      llamadas.push({ url, method, body });
      const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
      if (url === "/api/presupuestos" && method === "GET") return json({ items: lista });
      if (url === "/api/presupuestos" && method === "POST") {
        const id = `nuevo${++siguiente}`;
        docs[id] = crearEnBlanco(body.nombre || "Nuevo presupuesto", "2027-01-01T00:00:00Z");
        return json({ id, data: docs[id] }, 201);
      }
      const m = /^\/api\/presupuestos\/(.+)$/.exec(url);
      if (m) {
        const d = docs[m[1]];
        if (!d) return json({ error: "No existe" }, 404);
        if (method === "GET") return json({ data: d });
        if (method === "PUT") return json({ rev: d.rev + 1 });
        if (method === "DELETE") {
          delete docs[m[1]];
          return json({ ok: true });
        }
      }
      return json({ ok: true });
    }),
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const montar = (hash = "", inicial = lista) => {
  window.history.replaceState(null, "", "/" + hash);
  const user = userEvent.setup();
  render(<Aplicacion listaInicial={inicial} />);
  return user;
};
const h1 = () => screen.getByRole("heading", { level: 1 }).textContent;

describe("lista de presupuestos", () => {
  it("abre en la lista con el título 'Presupuestos'", async () => {
    montar();
    expect(await screen.findByRole("heading", { level: 1, name: "Presupuestos" })).toBeInTheDocument();
  });
  it("muestra cada presupuesto con su balance", async () => {
    montar();
    const fila = await screen.findByRole("button", { name: /Fin de año 2026/ });
    expect(norm(fila.textContent)).toContain("Sobran $ 73.400");
    expect(norm(fila.textContent)).toContain("Gastos $ 38.500");
  });
  it("un balance negativo dice 'Faltan'", async () => {
    lista = [item("a", "Corto", { balance: -250 })];
    montar("", lista);
    expect(norm((await screen.findByRole("button", { name: /Corto/ })).textContent)).toContain("Faltan $ 250");
  });
  it("tocar uno lo abre (carga sus datos) y cambia el link", async () => {
    const user = montar();
    await user.click(await screen.findByRole("button", { name: /Fin de año 2026/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Fin de año 2026" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/p/inicial");
    expect(llamadas.some((l) => l.url === "/api/presupuestos/inicial" && l.method === "GET")).toBe(true);
  });
  it("un link directo abre ese presupuesto", async () => {
    montar("#/p/inicial/ingresos");
    expect(await screen.findByRole("heading", { level: 1, name: "Ingresos" })).toBeInTheDocument();
  });
  it("muestra 'Cargando…' mientras trae los datos", async () => {
    const original = (fetch as any).getMockImplementation();
    (fetch as any).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/presupuestos/inicial") await new Promise((r) => setTimeout(r, 60));
      return original(url, init);
    });
    montar("#/p/inicial");
    expect(await screen.findByText("Cargando…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Fin de año 2026" })).toBeInTheDocument();
  });
  it("un link a un presupuesto que no existe ofrece volver a la lista", async () => {
    const user = montar("#/p/fantasma");
    expect(await screen.findByText("Ese presupuesto ya no existe.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver mis presupuestos" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Presupuestos" })).toBeInTheDocument();
  });
  it("si falla la carga permite reintentar", async () => {
    let falla = true;
    const original = (fetch as any).getMockImplementation();
    (fetch as any).mockImplementation(async (url: string, init?: RequestInit) => {
      if (falla && url === "/api/presupuestos/inicial") throw new Error("offline");
      return original(url, init);
    });
    const user = montar("#/p/inicial");
    expect(await screen.findByText(/No se pudo cargar/)).toBeInTheDocument();
    falla = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Fin de año 2026" })).toBeInTheDocument();
  });
  it("desde un presupuesto se vuelve a la lista", async () => {
    const user = montar("#/p/inicial");
    await user.click(await screen.findByRole("button", { name: "Volver a Presupuestos" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Presupuestos" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/");
  });
  it("al volver a la lista se actualizan los totales", async () => {
    montar();
    await screen.findByRole("button", { name: /Fin de año 2026/ });
    await waitFor(() => expect(llamadas.some((l) => l.url === "/api/presupuestos" && l.method === "GET")).toBe(true));
  });
  it("los archivados van aparte y se pueden mostrar", async () => {
    lista = [item("a", "Activo"), item("b", "Viejo", { archivado: true })];
    const user = montar("", lista);
    await screen.findByRole("button", { name: /Activo/ });
    expect(screen.queryByRole("button", { name: /Viejo/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archivados (1)" }));
    expect(screen.getByRole("button", { name: /Viejo/ })).toBeInTheDocument();
  });
  it("sin presupuestos abre directo el formulario de creación (sin 'Cancelar')", async () => {
    lista = [];
    montar("", []);
    expect(await screen.findByRole("heading", { name: "Nuevo presupuesto" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
  it("si solo hay archivados, invita a crear uno nuevo", async () => {
    lista = [item("b", "Viejo", { archivado: true })];
    montar("", lista);
    expect(await screen.findByText(/Todavía no tenés presupuestos/)).toBeInTheDocument();
  });
  it("tiene los ajustes de tema y salir", async () => {
    montar();
    expect(await screen.findByRole("radio", { name: "Oscuro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
  });
});

describe("crear un presupuesto", () => {
  it("por defecto propone copiar el último, con una explicación", async () => {
    const user = montar();
    await user.click(await screen.findByRole("button", { name: "Nuevo presupuesto" }));
    expect(screen.getByLabelText("Empezar desde")).toHaveValue("inicial");
    expect(screen.getByText(/montos en 0 y nada pagado/)).toBeInTheDocument();
  });
  it("crea una copia con el nombre indicado y la abre", async () => {
    const user = montar();
    await user.click(await screen.findByRole("button", { name: "Nuevo presupuesto" }));
    await user.type(screen.getByLabelText("Nombre"), "Fin de año 2027");
    await user.click(screen.getByRole("button", { name: "Crear" }));
    const post = llamadas.find((l) => l.method === "POST")!;
    expect(post.body).toEqual({ nombre: "Fin de año 2027", desde: { tipo: "duplicar", id: "inicial" } });
    expect(await screen.findByRole("heading", { level: 1, name: "Fin de año 2027" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/p/nuevo1");
  });
  it("en blanco manda origen 'blanco'", async () => {
    const user = montar();
    await user.click(await screen.findByRole("button", { name: "Nuevo presupuesto" }));
    await user.selectOptions(screen.getByLabelText("Empezar desde"), "");
    expect(screen.getByText("Empieza vacío, con una sola sección.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Crear" }));
    expect(llamadas.find((l) => l.method === "POST")!.body.desde).toEqual({ tipo: "blanco" });
  });
  it("cancelar cierra el formulario sin crear nada", async () => {
    const user = montar();
    await user.click(await screen.findByRole("button", { name: "Nuevo presupuesto" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("button", { name: "Crear" })).not.toBeInTheDocument();
    expect(llamadas.some((l) => l.method === "POST")).toBe(false);
  });
  it("si falla la creación muestra el error y deja reintentar", async () => {
    const original = (fetch as any).getMockImplementation();
    (fetch as any).mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "POST" ? new Response("{}", { status: 500 }) : original(url, init),
    );
    const user = montar();
    await user.click(await screen.findByRole("button", { name: "Nuevo presupuesto" }));
    await user.click(screen.getByRole("button", { name: "Crear" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo crear");
    expect(screen.getByRole("button", { name: "Crear" })).toBeEnabled();
  });
});

describe("ajustes de un presupuesto", () => {
  const ajustes = async () => {
    const user = montar("#/p/inicial/ajustes");
    await screen.findByRole("heading", { level: 1, name: "Ajustes" });
    return user;
  };

  it("renombrar actualiza el título y se guarda", async () => {
    const user = await ajustes();
    const campo = screen.getByLabelText("Nombre");
    await user.clear(campo);
    await user.type(campo, "Navidad 2027");
    await user.click(screen.getAllByRole("button", { name: "Resumen" })[0]);
    expect(h1()).toBe("Navidad 2027");
    await waitFor(() => expect(llamadas.some((l) => l.method === "PUT")).toBe(true), { timeout: 2500 });
    expect(llamadas.find((l) => l.method === "PUT")!.body.nombre).toBe("Navidad 2027");
  });
  it("archivar se guarda", async () => {
    const user = await ajustes();
    await user.click(screen.getByRole("checkbox", { name: /Archivado/ }));
    await waitFor(() => expect(llamadas.some((l) => l.method === "PUT")).toBe(true), { timeout: 2500 });
    expect(llamadas.find((l) => l.method === "PUT")!.body.archivado).toBe(true);
  });
  it("eliminar pide confirmación, borra y vuelve a la lista", async () => {
    const user = await ajustes();
    await user.click(screen.getByRole("button", { name: "Eliminar este presupuesto" }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Fin de año 2026"));
    expect(await screen.findByRole("heading", { level: 1, name: "Presupuestos" })).toBeInTheDocument();
    expect(llamadas.some((l) => l.method === "DELETE" && l.url === "/api/presupuestos/inicial")).toBe(true);
    expect(docs.inicial).toBeUndefined();
  });
  it("si cancelás la confirmación no se elimina", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = await ajustes();
    await user.click(screen.getByRole("button", { name: "Eliminar este presupuesto" }));
    expect(llamadas.some((l) => l.method === "DELETE")).toBe(false);
    expect(h1()).toBe("Ajustes");
  });
  it("eliminar no deja guardados pendientes que reaparezcan", async () => {
    const user = await ajustes();
    await user.type(screen.getByLabelText("Nombre"), "x"); // cambio sin guardar todavía
    await user.click(screen.getByRole("button", { name: "Eliminar este presupuesto" }));
    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });
    expect(llamadas.some((l) => l.method === "PUT")).toBe(false);
  });
  it("si falla el borrado avisa y se queda", async () => {
    const original = (fetch as any).getMockImplementation();
    (fetch as any).mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE" ? new Response("{}", { status: 500 }) : original(url, init),
    );
    const user = await ajustes();
    await user.click(screen.getByRole("button", { name: "Eliminar este presupuesto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo eliminar");
    expect(h1()).toBe("Ajustes");
  });
  it("los guardados van a la URL de este presupuesto", async () => {
    const user = montar("#/p/inicial/gastos");
    await screen.findByRole("heading", { level: 1, name: "Gastos" });
    await user.click(screen.getByRole("button", { name: /Auto/ }));
    await user.type(screen.getByLabelText("Monto de Patente (se paga en enero)"), "1");
    await waitFor(() => expect(llamadas.some((l) => l.method === "PUT")).toBe(true), { timeout: 2500 });
    expect(llamadas.find((l) => l.method === "PUT")!.url).toBe("/api/presupuestos/inicial");
  });
  it("si lo eliminaron desde otro dispositivo, al guardar vuelve a la lista", async () => {
    const original = (fetch as any).getMockImplementation();
    (fetch as any).mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "PUT" ? new Response("{}", { status: 404 }) : original(url, init),
    );
    const user = await ajustes();
    await user.click(screen.getByRole("checkbox", { name: /Archivado/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Presupuestos" }, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe("dos presupuestos a la vez", () => {
  it("cada uno muestra sus propios datos", async () => {
    docs.otro = { ...crearEnBlanco("Otro", "2027-01-01T00:00:00Z"), ingresos: [{ id: "i", nombre: "Solo acá", persona: "yo", fecha: "", monto: 42 }] };
    lista = [lista[0], item("otro", "Otro")];
    const user = montar("", lista);
    await user.click(await screen.findByRole("button", { name: /Otro/ }));
    await screen.findByRole("heading", { level: 1, name: "Otro" });
    expect(norm(within(screen.getAllByRole("status")[0]).getByTestId("balance-monto").textContent)).toBe("$ 42");
  });
});
