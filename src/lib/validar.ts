import type { Presupuesto } from "./types";

type Obj = Record<string, unknown>;

const esObj = (x: unknown): x is Obj => !!x && typeof x === "object" && !Array.isArray(x);
const esTexto = (x: unknown) => typeof x === "string" && x.length <= 5000;
const esMonto = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0;
const esBool = (x: unknown) => typeof x === "boolean";
const opcional = (x: unknown, ok: (v: unknown) => boolean) => x === undefined || ok(x);
const lista = (x: unknown, ok: (v: unknown) => boolean) => Array.isArray(x) && x.every(ok);

const esItem = (x: unknown) =>
  esObj(x) &&
  esTexto(x.id) &&
  esTexto(x.nombre) &&
  esMonto(x.monto) &&
  esBool(x.pagado) &&
  opcional(x.manual, esBool) &&
  opcional(x.fijo, esBool) &&
  opcional(x.ejemplo, esBool);

const esSubseccion = (x: unknown) =>
  esObj(x) &&
  esTexto(x.id) &&
  esTexto(x.nombre) &&
  lista(x.items, esItem) &&
  opcional(x.montoBase, esMonto) &&
  opcional(x.etiquetaItem, esTexto) &&
  opcional(x.omitirTexto, esTexto) &&
  opcional(x.omitida, esBool);

const esSeccion = (x: unknown) =>
  esObj(x) &&
  esTexto(x.id) &&
  esTexto(x.nombre) &&
  esTexto(x.emoji) &&
  opcional(x.nota, esTexto) &&
  opcional(x.tipo, (t) => t === "vacaciones") &&
  lista(x.items, esItem) &&
  lista(x.subsecciones, esSubseccion);

const esIngreso = (x: unknown) =>
  esObj(x) &&
  esTexto(x.id) &&
  esTexto(x.nombre) &&
  (x.persona === "yo" || x.persona === "esposa") &&
  typeof x.fecha === "string" &&
  (x.fecha === "" || /^\d{4}-\d{2}-\d{2}$/.test(x.fecha)) &&
  esMonto(x.monto) &&
  opcional(x.ejemplo, esBool);

const esDestino = (x: unknown) =>
  esObj(x) &&
  esTexto(x.id) &&
  esTexto(x.nombre) &&
  esTexto(x.notas) &&
  esBool(x.seleccionado) &&
  esMonto(x.transporte) &&
  esMonto(x.estadia) &&
  esMonto(x.comidas) &&
  esMonto(x.otros) &&
  opcional(x.ejemplo, esBool);

export function esPresupuestoValido(x: unknown): x is Presupuesto {
  return (
    esObj(x) &&
    typeof x.nombre === "string" &&
    x.nombre.length <= 120 &&
    opcional(x.creado, esTexto) &&
    opcional(x.archivado, esBool) &&
    typeof x.rev === "number" &&
    Number.isInteger(x.rev) &&
    x.rev >= 0 &&
    lista(x.ingresos, esIngreso) &&
    lista(x.secciones, esSeccion) &&
    lista(x.destinos, esDestino)
  );
}
