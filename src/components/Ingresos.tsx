"use client";

import { cronograma, nuevoId, redondear, totalPorPersona } from "@/lib/calc";
import { NOMBRES_PERSONA, type Ingreso, type Persona } from "@/lib/types";
import { BotonAgregar, BotonIcono, Dinero, MontoInput, TextoInput, confirmar } from "./ui";

const hoy = () => new Date().toISOString().slice(0, 10);

export default function Ingresos({
  ingresos,
  mutar,
}: {
  ingresos: Ingreso[];
  mutar: (fn: (l: Ingreso[]) => void) => void;
}) {
  const orden = cronograma(ingresos);
  const porPersona = (p: Persona) => totalPorPersona(ingresos, p);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">💰 Ingresos</h2>
      <p className="text-sm text-slate-500">Ordenados por fecha de cobro, con el acumulado.</p>

      {orden.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-400">
          Todavía no cargaste ingresos. Agregá el aguinaldo, el salario vacacional o lo que entre.
        </p>
      )}

      <ul className="mt-2 space-y-3">
        {orden.map(({ ingreso: ing, acumulado }) => {
          const upd = (fn: (i: Ingreso) => void) =>
            mutar((l) => fn(l.find((x) => x.id === ing.id)!));
          return (
            <li key={ing.id} className="rounded-xl border border-slate-200 p-2">
              <div className="flex items-center gap-1">
                <TextoInput
                  valor={ing.nombre}
                  placeholder="Nombre (ej. Aguinaldo)"
                  onChange={(s) => upd((i) => (i.nombre = s))}
                  className="min-w-0 flex-1 font-medium"
                />
                <BotonIcono
                  titulo="Eliminar ingreso"
                  peligro
                  onClick={() => {
                    if (confirmar(`¿Eliminar el ingreso "${ing.nombre || "sin nombre"}"?`))
                      mutar((l) => l.splice(l.findIndex((x) => x.id === ing.id), 1));
                  }}
                >
                  ✕
                </BotonIcono>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <select
                  value={ing.persona}
                  onChange={(e) => upd((i) => (i.persona = e.target.value as Persona))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-base"
                  aria-label="Persona"
                >
                  <option value="yo">{NOMBRES_PERSONA.yo}</option>
                  <option value="esposa">{NOMBRES_PERSONA.esposa}</option>
                </select>
                <input
                  type="date"
                  value={ing.fecha}
                  onChange={(e) => upd((i) => (i.fecha = e.target.value))}
                  aria-label="Fecha en que se recibe"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-base"
                />
                <MontoInput
                  valor={ing.monto}
                  onChange={(n) => upd((i) => (i.monto = n))}
                  className="w-28"
                  etiqueta={`Monto de ${ing.nombre}`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Acumulado hasta acá: <Dinero n={acumulado} className="font-semibold text-slate-700" />
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <BotonAgregar
          onClick={() =>
            mutar((l) =>
              l.push({ id: nuevoId(), nombre: "", persona: "yo", fecha: hoy(), monto: 0 }),
            )
          }
        >
          Agregar ingreso
        </BotonAgregar>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="text-slate-500">{NOMBRES_PERSONA.yo}</div>
          <Dinero n={porPersona("yo")} className="font-semibold" />
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="text-slate-500">{NOMBRES_PERSONA.esposa}</div>
          <Dinero n={porPersona("esposa")} className="font-semibold" />
        </div>
        <div className="rounded-xl bg-emerald-50 p-2">
          <div className="text-emerald-700">Total</div>
          <Dinero n={redondear(porPersona("yo") + porPersona("esposa"))} className="font-bold text-emerald-800" />
        </div>
      </div>
    </section>
  );
}
