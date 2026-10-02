export type Tema = "oscuro" | "claro" | "sistema";

export const TEMAS: { valor: Tema; etiqueta: string }[] = [
  { valor: "oscuro", etiqueta: "Oscuro" },
  { valor: "claro", etiqueta: "Claro" },
  { valor: "sistema", etiqueta: "Sistema" },
];

export const esTema = (x: unknown): x is Tema => x === "oscuro" || x === "claro" || x === "sistema";

/** ¿Hay que usar el modo oscuro con este tema? Por defecto (valor inválido) es oscuro. */
export function usaOscuro(tema: unknown, sistemaOscuro: boolean): boolean {
  if (tema === "claro") return false;
  if (tema === "sistema") return sistemaOscuro;
  return true;
}

export function leerTema(): Tema {
  try {
    const t = localStorage.getItem("tema");
    return esTema(t) ? t : "oscuro";
  } catch {
    return "oscuro";
  }
}

export function guardarTema(tema: Tema) {
  try {
    localStorage.setItem("tema", tema);
  } catch {
    /* modo privado: se aplica igual, solo no se recuerda */
  }
  const sistemaOscuro = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", usaOscuro(tema, sistemaOscuro));
}
