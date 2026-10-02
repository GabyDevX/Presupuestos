import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const raiz = join(__dirname, "..");
const publico = (f: string) => join(raiz, "public", f);

describe("PWA: manifest", () => {
  const m = manifest();
  it("la app se llama 'Presupuestos'", () => {
    expect(m.name).toBe("Presupuestos");
    expect(m.short_name).toBe("Presupuestos");
  });
  it("se abre como app independiente desde la raíz", () => {
    expect(m).toMatchObject({ start_url: "/", scope: "/", display: "standalone", lang: "es" });
  });
  it("los colores coinciden con el tema oscuro", () => {
    expect(m.background_color).toBe("#0a0c10");
    expect(m.theme_color).toBe("#0a0c10");
  });
  it("tiene íconos 192 y 512, y uno maskable", () => {
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect((m.icons ?? []).some((i) => i.purpose === "maskable")).toBe(true);
  });
  it("todos los íconos declarados existen como archivos PNG", () => {
    for (const i of m.icons ?? []) {
      const f = publico(i.src.replace(/^\//, ""));
      expect(existsSync(f), i.src).toBe(true);
      expect(readFileSync(f).subarray(1, 4).toString()).toBe("PNG");
    }
  });
  it("hay ícono para iOS (180x180)", () => {
    const png = readFileSync(publico("icon-180.png"));
    expect(png.readUInt32BE(16)).toBe(180);
    expect(png.readUInt32BE(20)).toBe(180);
  });
  it("los tamaños de los PNG coinciden con lo declarado", () => {
    for (const i of m.icons ?? []) {
      const png = readFileSync(publico(i.src.replace(/^\//, "")));
      const [w, h] = (i.sizes as string).split("x").map(Number);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([w, h]);
    }
  });
  it("ya no menciona 'fin de año' en el nombre", () => {
    expect(JSON.stringify(m).toLowerCase()).not.toContain("fin de año");
  });
});

describe("PWA: service worker", () => {
  const sw = readFileSync(publico("sw.js"), "utf8");
  it("nunca guarda ni intercepta las llamadas a la API (datos personales)", () => {
    expect(sw).toMatch(/startsWith\("\/api\/"\)\) return/);
  });
  it("solo maneja pedidos GET del mismo sitio", () => {
    expect(sw).toContain('req.method !== "GET"');
    expect(sw).toContain("url.origin !== self.location.origin");
  });
  it("usa la red primero para las páginas y cae a /offline.html", () => {
    expect(sw).toContain("fetch(req).catch(() => caches.match(OFFLINE))");
  });
  it("no guarda el manifest (para que los cambios de nombre se vean)", () => {
    expect(sw).not.toContain("webmanifest");
  });
  it("la página sin conexión existe, está en español y tiene botón de reintentar", () => {
    const html = readFileSync(publico("offline.html"), "utf8");
    expect(html).toContain('lang="es"');
    expect(html).toContain("Sin conexión");
    expect(html).toContain("Reintentar");
  });
  it("el service worker precarga la página sin conexión", () => {
    expect(sw).toContain('const OFFLINE = "/offline.html"');
    expect(sw).toContain("c.addAll([OFFLINE");
  });
});
