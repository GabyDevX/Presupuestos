"use client";

import { nuevoId, totalDestino } from "@/lib/calc";
import type { Destino } from "@/lib/types";
import { BotonAgregar, BotonIcono, Dinero, MontoInput, TextoInput, confirmar } from "./ui";

const CAMPOS = [
  ["transporte", "Transporte / viaje"],
  ["estadia", "Estadía"],
  ["comidas", "Comidas"],
  ["otros", "Otros"],
] as const;

export default function Destinos({
  destinos,
  balanceBase,
  mutar,
}: {
  destinos: Destino[];
  /** Balance general sin ninguna opción de vacaciones. */
  balanceBase: number;
  mutar: (fn: (l: Destino[]) => void) => void;
}) {
  const elegidos = destinos.filter((d) => d.seleccionado).length;

  return (
    <div className="mt-3 rounded-xl bg-sky-50 p-3">
      <h3 className="font-semibold text-sky-900">Opciones de destino</h3>
      <p className="text-sm text-sky-800">
        Marcá una o varias para sumarlas al presupuesto
        {elegidos > 0 && ` (${elegidos} elegida${elegidos > 1 ? "s" : ""})`}.
      </p>

      {destinos.length === 0 && (
        <p className="py-3 text-sm text-slate-500">
          Todavía no hay destinos. Agregá una opción para comparar costos.
        </p>
      )}

      <div className="mt-2 space-y-3">
        {destinos.map((d, idx) => {
          const total = totalDestino(d);
          const balanceSolo = balanceBase - total;
          return (
            <div
              key={d.id}
              className={`rounded-xl border bg-white p-3 ${d.seleccionado ? "border-sky-500 ring-1 ring-sky-500" : "border-slate-200"}`}
            >
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={d.seleccionado}
                  aria-label={`Seleccionar ${d.nombre}`}
                  onChange={(e) => mutar((l) => (l[idx].seleccionado = e.target.checked))}
                  className="h-6 w-6 shrink-0 accent-sky-600"
                />
                <TextoInput
                  valor={d.nombre}
                  placeholder="Nombre del lugar"
                  onChange={(s) => mutar((l) => (l[idx].nombre = s))}
                  className="min-w-0 flex-1 font-semibold"
                />
                <BotonIcono
                  titulo="Eliminar destino"
                  peligro
                  onClick={() => {
                    if (confirmar(`¿Eliminar la opción "${d.nombre || "sin nombre"}"?`))
                      mutar((l) => l.splice(idx, 1));
                  }}
                >
                  ✕
                </BotonIcono>
              </div>
              <textarea
                value={d.notas}
                onChange={(e) => mutar((l) => (l[idx].notas = e.target.value))}
                placeholder="Notas: dónde iríamos, links, ideas…"
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CAMPOS.map(([campo, etiqueta]) => (
                  <label key={campo} className="text-xs text-slate-500">
                    {etiqueta}
                    <MontoInput
                      valor={d[campo]}
                      onChange={(n) => mutar((l) => (l[idx][campo] = n))}
                      className="mt-0.5 w-full"
                      etiqueta={`${etiqueta} de ${d.nombre}`}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Total de la opción</span>
                <Dinero n={total} className="text-base font-bold" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Balance si elegimos solo esta</span>
                <Dinero
                  n={balanceSolo}
                  className={`font-semibold ${balanceSolo >= 0 ? "text-emerald-700" : "text-rose-600"}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <BotonAgregar
          onClick={() =>
            mutar((l) =>
              l.push({
                id: nuevoId(),
                nombre: "",
                notas: "",
                seleccionado: false,
                transporte: 0,
                estadia: 0,
                comidas: 0,
                otros: 0,
              }),
            )
          }
        >
          Agregar destino
        </BotonAgregar>
      </div>
    </div>
  );
}
