import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (cookieJar.has(k) ? { value: cookieJar.get(k) } : undefined) }),
}));

import { COOKIE, estaAutenticado, passwordCorrecta, valorCookie } from "@/lib/auth";
import { POST as login } from "@/app/api/login/route";
import { POST as logout } from "@/app/api/logout/route";
import { GET, PUT } from "@/app/api/presupuesto/route";
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
  (globalThis as { __presupuesto?: unknown }).__presupuesto = undefined; // memoria del store
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

describe("GET /api/presupuesto", () => {
  it("sin sesión: 401", async () => {
    expect((await GET()).status).toBe(401);
  });
  it("primera vez: devuelve el seed (rev 0)", async () => {
    entrar();
    const r = await GET();
    expect(r.status).toBe(200);
    const { data } = await r.json();
    expect(data.rev).toBe(0);
    expect(data.secciones).toHaveLength(6);
  });
});

describe("PUT /api/presupuesto", () => {
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
    const base = crearSeed();
    const persona1 = { ...base, ingresos: [] };
    const persona2 = { ...base, destinos: [] };
    expect((await PUT(put(persona1))).status).toBe(200);
    const r2 = await PUT(put(persona2));
    expect(r2.status).toBe(409);
    const { data } = await r2.json();
    expect(data.rev).toBe(1);
    expect(data.ingresos).toEqual([]); // cambios de la persona 1 intactos
    expect(data.destinos.length).toBeGreaterThan(0); // y los de la persona 2 no se aplicaron
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
  it("acepta un documento vacío", async () => {
    entrar();
    expect((await PUT(put(presupuesto()))).status).toBe(200);
  });
});
