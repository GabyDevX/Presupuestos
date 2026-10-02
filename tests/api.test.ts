import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (cookieJar.has(k) ? { value: cookieJar.get(k) } : undefined) }),
}));

import { COOKIE, estaAutenticado, passwordCorrecta, valorCookie } from "@/lib/auth";
import { POST as login } from "@/app/api/login/route";
import { POST as logout } from "@/app/api/logout/route";
import { GET as listarGET, POST as crearPOST } from "@/app/api/presupuestos/route";
import { DELETE, GET as obtenerGET, PUT as guardarPUT } from "@/app/api/presupuestos/[id]/route";
import { reiniciarMemoria } from "@/lib/store";
import { crearEjemplo as crearSeed } from "./ejemplo";
import { presupuesto } from "./helpers";

const json = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });
const put = (body: unknown) =>
  new Request("http://x/api/presupuesto", {
    method: "PUT",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const entrar = () => cookieJar.set(COOKIE, valorCookie()!);

beforeEach(() => {
  vi.stubEnv("APP_PASSWORD", "secreta");
  cookieJar.clear();
  reiniciarMemoria();
});
afterEach(() => vi.unstubAllEnvs());

describe("auth", () => {
  it("acepta solo la contraseña correcta", () => {
    expect(passwordCorrecta("secreta")).toBe(true);
    expect(passwordCorrecta("Secreta")).toBe(false);
    expect(passwordCorrecta("")).toBe(false);
    expect(passwordCorrecta("secreta ")).toBe(false);
  });
  it("sin APP_PASSWORD nadie entra, ni siquiera con contraseña vacía", () => {
    vi.stubEnv("APP_PASSWORD", "");
    expect(passwordCorrecta("")).toBe(false);
    expect(valorCookie()).toBeNull();
  });
  it("la cookie depende de la contraseña (cambiarla cierra las sesiones)", () => {
    const a = valorCookie();
    vi.stubEnv("APP_PASSWORD", "otra");
    expect(valorCookie()).not.toBe(a);
  });
  it("la cookie no contiene la contraseña", () => {
    expect(valorCookie()).not.toContain("secreta");
  });
  it("estaAutenticado: sin cookie, con cookie falsa y con cookie válida", async () => {
    expect(await estaAutenticado()).toBe(false);
    cookieJar.set(COOKIE, "falsa");
    expect(await estaAutenticado()).toBe(false);
    entrar();
    expect(await estaAutenticado()).toBe(true);
  });
  it("una cookie vieja deja de valer si cambia la contraseña", async () => {
    entrar();
    vi.stubEnv("APP_PASSWORD", "nueva");
    expect(await estaAutenticado()).toBe(false);
  });
});

describe("POST /api/login", () => {
  it("contraseña correcta: 200 y cookie httpOnly", async () => {
    const r = await login(json({ password: "secreta" }));
    expect(r.status).toBe(200);
    const c = r.headers.get("set-cookie")!;
    expect(c).toContain(`${COOKIE}=${valorCookie()}`);
    expect(c.toLowerCase()).toContain("httponly");
    expect(c.toLowerCase()).toContain("samesite=lax");
  });
  it("contraseña incorrecta: 401 sin cookie", async () => {
    vi.useFakeTimers();
    const p = login(json({ password: "mala" }));
    await vi.advanceTimersByTimeAsync(1000);
    const r = await p;
    vi.useRealTimers();
    expect(r.status).toBe(401);
    expect(r.headers.get("set-cookie")).toBeNull();
  });
  it("cuerpo inválido o sin contraseña: 401", async () => {
    vi.useFakeTimers();
    const ps = [
      login(new Request("http://x", { method: "POST", body: "no es json" })),
      login(json({})),
      login(json({ password: 123 })),
    ];
    await vi.advanceTimersByTimeAsync(1000);
    const rs = await Promise.all(ps);
    vi.useRealTimers();
    expect(rs.map((r) => r.status)).toEqual([401, 401, 401]);
  });
  it("servidor sin APP_PASSWORD: 500 con mensaje claro", async () => {
    vi.stubEnv("APP_PASSWORD", "");
    const r = await login(json({ password: "" }));
    expect(r.status).toBe(500);
    expect((await r.json()).error).toMatch(/APP_PASSWORD/);
  });
});

describe("POST /api/logout", () => {
  it("borra la cookie", async () => {
    const r = await logout();
    expect(r.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });
});

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const GET = () => obtenerGET(new Request("http://x"), ctx("inicial"));
const PUT = (req: Request, id = "inicial") => guardarPUT(req, ctx(id));
const post = (body: unknown) =>
  new Request("http://x/api/presupuestos", { method: "POST", body: JSON.stringify(body) });

describe("GET /api/presupuestos/[id]", () => {
  it("sin sesión: 401", async () => {
    expect((await GET()).status).toBe(401);
  });
  it("primera vez: el presupuesto inicial son los datos iniciales (rev 0)", async () => {
    entrar();
    const r = await GET();
    expect(r.status).toBe(200);
    const { data } = await r.json();
    expect(data.rev).toBe(0);
    expect(data.nombre).toBe("Fin de año 2026");
    expect(data.secciones).toHaveLength(6);
  });
  it("id inexistente o inválido: 404", async () => {
    entrar();
    expect((await obtenerGET(new Request("http://x"), ctx("nada"))).status).toBe(404);
    expect((await obtenerGET(new Request("http://x"), ctx("../etc"))).status).toBe(404);
  });
});

describe("PUT /api/presupuestos/[id]", () => {
  it("sin sesión: 401 y no guarda nada", async () => {
    expect((await PUT(put(crearSeed()))).status).toBe(401);
    entrar();
    expect((await (await GET()).json()).data.rev).toBe(0);
  });
  it("guarda, incrementa rev y GET devuelve lo guardado", async () => {
    entrar();
    const doc = crearSeed();
    doc.ingresos = [];
    const r = await PUT(put(doc));
    expect(r.status).toBe(200);
    expect((await r.json()).rev).toBe(1);
    const { data } = await (await GET()).json();
    expect(data.rev).toBe(1);
    expect(data.ingresos).toEqual([]);
  });
  it("dos personas con la misma versión: la segunda recibe 409 con los datos de la primera", async () => {
    entrar();
    await GET(); // inicializa
    const base = crearSeed();
    const persona1 = { ...base, ingresos: [] };
    const persona2 = { ...base, destinos: [] };
    expect((await PUT(put(persona1))).status).toBe(200);
    const r2 = await PUT(put(persona2));
    expect(r2.status).toBe(409);
    const { data } = await r2.json();
    expect(data.rev).toBe(1);
    expect(data.ingresos).toEqual([]);
    expect(data.destinos.length).toBeGreaterThan(0);
  });
  it("tras el 409, reintentar con la rev nueva funciona", async () => {
    entrar();
    await PUT(put(crearSeed()));
    const r = await PUT(put({ ...crearSeed(), rev: 1, ingresos: [] }));
    expect(r.status).toBe(200);
    expect((await r.json()).rev).toBe(2);
  });
  it("JSON inválido: 400", async () => {
    entrar();
    expect((await PUT(put("{no"))).status).toBe(400);
  });
  it("formato inválido: 400", async () => {
    entrar();
    expect((await PUT(put({ rev: 0 }))).status).toBe(400);
    const malo = crearSeed();
    malo.ingresos[0].monto = -5;
    expect((await PUT(put(malo))).status).toBe(400);
    const sinNombre: any = crearSeed();
    delete sinNombre.nombre;
    expect((await PUT(put(sinNombre))).status).toBe(400);
  });
  it("cuerpo demasiado grande: 413", async () => {
    entrar();
    expect((await PUT(put("x".repeat(1_000_001)))).status).toBe(413);
  });
  it("un rechazo no altera lo guardado", async () => {
    entrar();
    await PUT(put({ rev: 0, ingresos: "mal" }));
    expect((await (await GET()).json()).data.rev).toBe(0);
  });
  it("guardar en un presupuesto que no existe: 404 (no lo crea)", async () => {
    entrar();
    await GET();
    expect((await PUT(put(presupuesto()), "fantasma")).status).toBe(404);
    expect((await (await listarGET()).json()).items).toHaveLength(1);
  });
  it("renombrar y archivar se guardan como cualquier cambio", async () => {
    entrar();
    await PUT(put({ ...crearSeed(), nombre: "Otro nombre", archivado: true }));
    const { data } = await (await GET()).json();
    expect(data).toMatchObject({ nombre: "Otro nombre", archivado: true });
  });
});

describe("GET /api/presupuestos (lista)", () => {
  it("sin sesión: 401", async () => {
    expect((await listarGET()).status).toBe(401);
  });
  it("devuelve el inicial con sus totales", async () => {
    entrar();
    const { items } = await (await listarGET()).json();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "inicial", nombre: "Fin de año 2026", archivado: false,
      ingresos: 111900, planificado: 38500, balance: 73400,
    });
  });
});

describe("POST /api/presupuestos (crear)", () => {
  it("sin sesión: 401", async () => {
    expect((await crearPOST(post({ nombre: "x" }))).status).toBe(401);
  });
  it("en blanco: crea un presupuesto vacío y aparece en la lista", async () => {
    entrar();
    const r = await crearPOST(post({ nombre: "Vacaciones 2027", desde: { tipo: "blanco" } }));
    expect(r.status).toBe(201);
    const { id, data } = await r.json();
    expect(data).toMatchObject({ nombre: "Vacaciones 2027", rev: 0, ingresos: [], destinos: [] });
    const { items } = await (await listarGET()).json();
    expect(items.map((x: any) => x.nombre)).toEqual(["Fin de año 2026", "Vacaciones 2027"]);
    expect((await obtenerGET(new Request("http://x"), ctx(id))).status).toBe(200);
  });
  it("sin 'desde' crea en blanco; sin nombre usa uno por defecto", async () => {
    entrar();
    const { data } = await (await crearPOST(post({}))).json();
    expect(data.nombre).toBe("Nuevo presupuesto");
  });
  it("duplicar: copia la estructura con montos en 0", async () => {
    entrar();
    const r = await crearPOST(post({ nombre: "Fin de año 2027", desde: { tipo: "duplicar", id: "inicial" } }));
    expect(r.status).toBe(201);
    const { data } = await r.json();
    expect(data.secciones).toHaveLength(6);
    expect(data.ingresos).toHaveLength(4);
    expect(data.ingresos.every((i: any) => i.monto === 0)).toBe(true);
    expect(data.ingresos[0].fecha).toBe("2027-12-15");
  });
  it("duplicar no modifica el original", async () => {
    entrar();
    await crearPOST(post({ nombre: "Copia", desde: { tipo: "duplicar", id: "inicial" } }));
    const { data } = await (await GET()).json();
    expect(data.ingresos[0].monto).toBe(60000);
  });
  it("duplicar uno que no existe: 404", async () => {
    entrar();
    expect((await crearPOST(post({ nombre: "x", desde: { tipo: "duplicar", id: "nada" } }))).status).toBe(404);
  });
  it("origen o id inválidos: 400", async () => {
    entrar();
    expect((await crearPOST(post({ nombre: "x", desde: { tipo: "raro" } }))).status).toBe(400);
    expect((await crearPOST(post({ nombre: "x", desde: { tipo: "duplicar", id: "../x" } }))).status).toBe(400);
    expect((await crearPOST(post({ nombre: "x", desde: { tipo: "duplicar" } }))).status).toBe(400);
  });
  it("cada presupuesto se guarda por separado", async () => {
    entrar();
    const { id } = await (await crearPOST(post({ nombre: "B" }))).json();
    const doc = presupuesto({ nombre: "B", ingresos: [] });
    expect((await PUT(put(doc), id)).status).toBe(200);
    expect((await (await GET()).json()).data.rev).toBe(0); // el inicial no cambió
  });
  it("ids distintos para cada uno", async () => {
    entrar();
    const a = (await (await crearPOST(post({ nombre: "A" }))).json()).id;
    const b = (await (await crearPOST(post({ nombre: "B" }))).json()).id;
    expect(a).not.toBe(b);
  });
});

describe("DELETE /api/presupuestos/[id]", () => {
  it("sin sesión: 401", async () => {
    expect((await DELETE(new Request("http://x"), ctx("inicial"))).status).toBe(401);
  });
  it("elimina y desaparece de la lista", async () => {
    entrar();
    const { id } = await (await crearPOST(post({ nombre: "Borrar" }))).json();
    expect((await DELETE(new Request("http://x"), ctx(id))).status).toBe(200);
    expect((await obtenerGET(new Request("http://x"), ctx(id))).status).toBe(404);
    expect((await (await listarGET()).json()).items.map((x: any) => x.id)).toEqual(["inicial"]);
  });
  it("eliminar dos veces: 404", async () => {
    entrar();
    const { id } = await (await crearPOST(post({ nombre: "Borrar" }))).json();
    await DELETE(new Request("http://x"), ctx(id));
    expect((await DELETE(new Request("http://x"), ctx(id))).status).toBe(404);
  });
  it("si se eliminan todos, la lista queda vacía y NO vuelven los datos iniciales", async () => {
    entrar();
    await listarGET();
    await DELETE(new Request("http://x"), ctx("inicial"));
    expect((await (await listarGET()).json()).items).toEqual([]);
  });
});
