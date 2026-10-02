"use client";

import { useState } from "react";
import { montoItem, nuevoId } from "@/lib/calc";
import type { Item } from "@/lib/types";
import { BotonAgregar, BotonIcono, MontoInput, TextoInput, confirmar } from "./ui";

export default function ItemsLista({
  items,
  mutar,
  deshabilitada,
  montoBase,
  etiquetaAgregar = "ítem",
}: {
  items: Item[];
  mutar: (fn: (items: Item[]) => void) => void;
  deshabilitada?: boolean;
  /** Presupuesto general de la lista: los ítems no editados a mano lo siguen. */
  montoBase?: number;
  etiquetaAgregar?: string;
}) {
  const [nuevo, setNuevo] = useState<string | null>(null);

  return (
    <div className={deshabilitada ? "pointer-events-none opacity-40" : ""}>
      {items.length === 0 && (
        <p className="py-2 text-sm text-slate-400">
          {etiquetaAgregar === "ítem" ? "Todavía no hay ítems. ¡Agregá el primero!" : `Todavía no hay nadie en la lista. ¡Agregá la primera ${etiquetaAgregar}!`}
        </p>
      )}
      <ul className="divide-y divide-slate-100">
        {items.map((it, idx) => (
          <li key={it.id} className="flex items-center gap-1 py-1">
            <input
              type="checkbox"
              checked={it.pagado}
              aria-label={`Marcar "${it.nombre}" como pagado`}
              onChange={(e) => mutar((l) => (l[idx].pagado = e.target.checked))}
              className="h-6 w-6 shrink-0 accent-emerald-600"
            />
            <TextoInput
              valor={it.nombre}
              placeholder="Nombre del ítem"
              autoFocus={it.id === nuevo}
              onChange={(s) => mutar((l) => (l[idx].nombre = s))}
              className={`min-w-0 flex-1 ${it.pagado ? "text-slate-400 line-through" : ""}`}
            />
            <MontoInput
              valor={montoItem(it, { montoBase })}
              onChange={(n) =>
                mutar((l) => {
                  l[idx].monto = n;
                  if (montoBase !== undefined) l[idx].manual = true;
                })
              }
              className="w-24 shrink-0"
              etiqueta={`Monto de ${it.nombre}`}
            />
            {montoBase !== undefined && it.manual && (
              <BotonIcono
                titulo="Volver al presupuesto general"
                onClick={() => mutar((l) => (l[idx].manual = false))}
              >
                ↺
              </BotonIcono>
            )}
            <BotonIcono
              titulo="Eliminar ítem"
              peligro
              disabled={it.fijo}
              onClick={() => {
                if (confirmar(`¿Eliminar "${it.nombre || "este ítem"}"?`)) mutar((l) => l.splice(idx, 1));
              }}
            >
              ✕
            </BotonIcono>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <BotonAgregar
          onClick={() => {
            const id = nuevoId();
            setNuevo(id);
            mutar((l) => l.push({ id, nombre: "", monto: 0, pagado: false }));
          }}
        >
          Agregar {etiquetaAgregar}
        </BotonAgregar>
      </div>
    </div>
  );
}
