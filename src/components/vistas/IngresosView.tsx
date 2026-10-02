"use client";

import { cronograma, nuevoId, redondear, totalPorPersona } from "@/lib/calc";
import { NOMBRES_PERSONA, type Ingreso, type Persona } from "@/lib/types";
import { BotonAgregar, BotonIcono, Dinero, MontoInput, Tarjeta, TextoInput, confirmar } from "../ui";

const hoy = () => new Date().toISOString().slice(0, 10);

export default function IngresosView({
  ingresos,
  mutar,
}: {
  ingresos: Ingreso[];
  mutar: (fn: (l: Ingreso[]) => void) => void;
}) {
  const orden = cronograma(ingresos);
  const porPersona = (p: Persona) => totalPorPersona(ingresos, p);

  return (
    <div className="aparecer space-y-5">
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        {(["yo", "esposa"] as Persona[]).map((p) => (
          <div key={p} className="rounded-2xl border border-line bg-surface p-3">
            <div className="text-muted">{NOMBRES_PERSONA[p]}</div>
            <Dinero n={porPersona(p)} className="font-semibold" />
          </div>
        ))}
        <div className="rounded-2xl bg-okbg p-3 text-ok">
          <div>Total</div>
          <Dinero n={redondear(porPersona("yo") + porPersona("esposa"))} className="font-semibold" />
        </div>
      </div>

      {orden.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          Todavía no cargaste ingresos. Agregá el aguinaldo, el salario vacacional o lo que entre.
        </p>
      )}

      <ul className="space-y-3">
        {orden.map(({ ingreso: ing, acumulado }) => {
          const upd = (fn: (i: Ingreso) => void) => mutar((l) => fn(l.find((x) => x.id === ing.id)!));
          return (
            <li key={ing.id}>
              <Tarjeta className="space-y-3">
                <div className="flex items-center gap-1">
                  <TextoInput
                    valor={ing.nombre}
                    placeholder="Nombre (ej. Aguinaldo)"
                    onChange={(s) => upd((i) => (i.nombre = s))}
                    className="min-w-0 flex-1 font-semibold"
                  />
                  <BotonIcono
                    titulo="Eliminar ingreso"
                    icono="basura"
                    peligro
                    onClick={() => {
                      if (confirmar(`¿Eliminar el ingreso "${ing.nombre || "sin nombre"}"?`))
                        mutar((l) => l.splice(l.findIndex((x) => x.id === ing.id), 1));
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={ing.persona}
                    onChange={(e) => upd((i) => (i.persona = e.target.value as Persona))}
                    className="field"
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
                    className="field"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    Acumulado hasta acá: <Dinero n={acumulado} className="font-medium text-fg" />
                  </p>
                  <MontoInput
                    valor={ing.monto}
                    onChange={(n) => upd((i) => (i.monto = n))}
                    className="w-36"
                    etiqueta={`Monto de ${ing.nombre}`}
                  />
                </div>
              </Tarjeta>
            </li>
          );
        })}
      </ul>

      <BotonAgregar
        onClick={() =>
          mutar((l) => l.push({ id: nuevoId(), nombre: "", persona: "yo", fecha: hoy(), monto: 0 }))
        }
      >
        Agregar ingreso
      </BotonAgregar>
    </div>
  );
}
