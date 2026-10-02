"use client";

import { useState } from "react";
import { nuevoId, totalesSeccion, totalSubseccion } from "@/lib/calc";
import type { Destino, Item, Seccion } from "@/lib/types";
import Destinos from "./Destinos";
import ItemsLista from "./ItemsLista";
import { mover } from "@/lib/acciones";
import { BotonAgregar, BotonIcono, Dinero, MontoInput, TextoInput, confirmar } from "./ui";

export default function SeccionCard({
  seccion: s,
  indice,
  cantidad,
  destinos,
  balanceBase,
  mutarSeccion,
  moverSeccion,
  eliminarSeccion,
  mutarDestinos,
}: {
  seccion: Seccion;
  indice: number;
  cantidad: number;
  destinos: Destino[];
  balanceBase: number;
  mutarSeccion: (fn: (s: Seccion) => void) => void;
  moverSeccion: (dir: -1 | 1) => void;
  eliminarSeccion: () => void;
  mutarDestinos: (fn: (l: Destino[]) => void) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const t = totalesSeccion(s, destinos);
  const cantItems =
    s.items.length + s.subsecciones.reduce((n, x) => n + x.items.length, 0);

  return (
    <section className="rounded-2xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl">{s.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{s.nombre || "Sin nombre"}</span>
          <span className="block text-xs text-slate-500">
            Pagado <Dinero n={t.pagado} /> · Pendiente <Dinero n={t.pendiente} />
          </span>
        </span>
        <span className="text-right">
          <Dinero n={t.planificado} className="block font-bold" />
          <span className="text-xs text-slate-400">{abierta ? "▲ cerrar" : "▼ abrir"}</span>
        </span>
      </button>

      {abierta && (
        <div className="space-y-4 border-t border-slate-100 p-4">
          {(s.items.length > 0 || (s.subsecciones.length === 0 && s.tipo !== "vacaciones")) && (
            <ItemsLista items={s.items} mutar={(fn) => mutarSeccion((x) => fn(x.items))} />
          )}

          {s.subsecciones.map((sub, si) => {
            const mutarSub = (fn: (items: Item[]) => void) =>
              mutarSeccion((x) => fn(x.subsecciones[si].items));
            return (
              <div key={sub.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1">
                  <TextoInput
                    valor={sub.nombre}
                    placeholder="Nombre de la subsección"
                    onChange={(v) => mutarSeccion((x) => (x.subsecciones[si].nombre = v))}
                    className="min-w-0 flex-1 font-semibold"
                  />
                  <BotonIcono titulo="Subir" disabled={si === 0} onClick={() => mutarSeccion((x) => mover(x.subsecciones, si, -1))}>↑</BotonIcono>
                  <BotonIcono titulo="Bajar" disabled={si === s.subsecciones.length - 1} onClick={() => mutarSeccion((x) => mover(x.subsecciones, si, 1))}>↓</BotonIcono>
                  <BotonIcono
                    titulo="Eliminar subsección"
                    peligro
                    onClick={() => {
                      if (confirmar(`¿Eliminar la subsección "${sub.nombre || "sin nombre"}" con todos sus ítems?`))
                        mutarSeccion((x) => x.subsecciones.splice(si, 1));
                    }}
                  >
                    ✕
                  </BotonIcono>
                </div>
                {sub.omitirTexto && (
                  <label className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-2 py-2 text-sm text-amber-900">
                    <input
                      type="checkbox"
                      checked={!!sub.omitida}
                      onChange={(e) => mutarSeccion((x) => (x.subsecciones[si].omitida = e.target.checked))}
                      className="h-5 w-5 accent-amber-600"
                    />
                    {sub.omitirTexto}
                  </label>
                )}
                {sub.montoBase !== undefined && (
                  <label className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium">Presupuesto general por {sub.etiquetaItem ?? "ítem"}</span>
                      <span className="block text-xs text-slate-500">
                        Se aplica a todos; editá un monto para cambiar solo ese.
                      </span>
                    </span>
                    <MontoInput
                      valor={sub.montoBase}
                      onChange={(n) => mutarSeccion((x) => (x.subsecciones[si].montoBase = n))}
                      className="w-28 shrink-0"
                      etiqueta={`Presupuesto general de ${sub.nombre}`}
                    />
                  </label>
                )}
                <ItemsLista
                  items={sub.items}
                  mutar={mutarSub}
                  deshabilitada={sub.omitida}
                  montoBase={sub.montoBase}
                  etiquetaAgregar={sub.etiquetaItem}
                />
                {sub.items.length > 0 && (
                  <p className="mt-2 text-right text-xs text-slate-500">
                    {sub.items.length} {sub.items.length === 1 ? "ítem" : "ítems"} · Subtotal{" "}
                    <Dinero n={totalSubseccion(sub)} className="font-semibold text-slate-700" />
                  </p>
                )}
              </div>
            );
          })}

          {s.nota !== undefined && (
            <textarea
              value={s.nota}
              onChange={(e) => mutarSeccion((x) => (x.nota = e.target.value))}
              placeholder="Notas de la sección…"
              aria-label={`Notas de ${s.nombre}`}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          )}

          {s.tipo === "vacaciones" && (
            <Destinos destinos={destinos} balanceBase={balanceBase} mutar={mutarDestinos} />
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <BotonAgregar
              onClick={() =>
                mutarSeccion((x) => x.subsecciones.push({ id: nuevoId(), nombre: "", items: [] }))
              }
            >
              Agregar subsección
            </BotonAgregar>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
            <span className="text-xs font-medium text-slate-500">Sección:</span>
            <TextoInput
              valor={s.emoji}
              onChange={(v) => mutarSeccion((x) => (x.emoji = v))}
              className="w-12 text-center"
            />
            <TextoInput
              valor={s.nombre}
              placeholder="Nombre de la sección"
              onChange={(v) => mutarSeccion((x) => (x.nombre = v))}
              className="min-w-0 flex-1 border-slate-200 bg-white"
            />
            <BotonIcono titulo="Subir sección" disabled={indice === 0} onClick={() => moverSeccion(-1)}>↑</BotonIcono>
            <BotonIcono titulo="Bajar sección" disabled={indice === cantidad - 1} onClick={() => moverSeccion(1)}>↓</BotonIcono>
            <BotonIcono
              titulo="Eliminar sección"
              peligro
              onClick={() => {
                if (
                  confirmar(
                    `¿Eliminar la sección "${s.nombre || "sin nombre"}" con ${cantItems} ítem${cantItems === 1 ? "" : "s"}?`,
                  )
                )
                  eliminarSeccion();
              }}
            >
              🗑
            </BotonIcono>
          </div>
        </div>
      )}
    </section>
  );
}
