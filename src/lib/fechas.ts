/** "2026-12-15" → "15 dic". Sin fecha o inválida → "Sin fecha". */
export function formatoFecha(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Sin fecha";
  const [a, m, d] = iso.split("-").map(Number);
  const fecha = new Date(a, m - 1, d);
  if (fecha.getFullYear() !== a || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) return "Sin fecha";
  return fecha.toLocaleDateString("es-UY", { day: "numeric", month: "short" }).replace(".", "");
}
