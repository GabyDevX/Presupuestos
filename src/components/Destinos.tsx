"use client";

import { balanceSoloDestino, nuevoId, totalDestino } from "@/lib/calc";
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
    <div className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-semibold">Opciones de destino</h3>
      <p className="text-sm text-muted">
        Marcá una o varias para sumarlas al presupuesto
        {elegidos > 0 && ` (${elegidos} elegida${elegidos > 1 ? "s" : ""})`}.
      </p>

      {destinos.length === 0 && (
        <p className="py-4 text-sm text-muted">Todavía no hay destinos. Agregá una opción para comparar costos.</p>
      )}

      <div className="mt-3 space-y-3">
        {destinos.map((d, idx) => {
          const total = totalDestino(d);
          const balanceSolo = balanceSoloDestino(balanceBase, d);
          return (
            <div
              key={d.id}
              data-destino={d.nombre}
              className={`rounded-xl border p-3 transition-colors ${
                d.seleccionado ? "border-accent bg-raised" : "border-line"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="check check-accent"
                  checked={d.seleccionado}
                  aria-label={`Seleccionar ${d.nombre}`}
                  onChange={(e) => mutar((l) => (l[idx].seleccionado = e.target.checked))}
                />
                <TextoInput
                  valor={d.nombre}
                  placeholder="Nombre del lugar"
                  onChange={(s) => mutar((l) => (l[idx].nombre = s))}
                  className="min-w-0 flex-1 font-semibold"
                />
                <BotonIcono
                  titulo="Eliminar destino"
                  icono="basura"
                  peligro
                  onClick={() => {
                    if (confirmar(`¿Eliminar la opción "${d.nombre || "sin nombre"}"?`)) mutar((l) => l.splice(idx, 1));
                  }}
                />
              </div>
              <textarea
                value={d.notas}
                onChange={(e) => mutar((l) => (l[idx].notas = e.target.value))}
                placeholder="Notas: dónde iríamos, links, ideas…"
                rows={2}
                className="field mt-2 text-sm"
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                {CAMPOS.map(([campo, etiqueta]) => (
                  <label key={campo} className="text-xs text-muted">
                    {etiqueta}
                    <MontoInput
                      valor={d[campo]}
                      onChange={(n) => mutar((l) => (l[idx][campo] = n))}
                      className="mt-1"
                      etiqueta={`${etiqueta} de ${d.nombre}`}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted">Total de la opción</span>
                <Dinero n={total} className="text-base font-semibold" />
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs">
                <span className="text-muted">Balance si elegimos solo esta</span>
                <Dinero n={balanceSolo} className={`font-medium ${balanceSolo >= 0 ? "text-ok" : "text-bad"}`} />
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
