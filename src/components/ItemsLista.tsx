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
        <p className="py-3 text-sm text-muted">
          {etiquetaAgregar === "ítem"
            ? "Todavía no hay ítems. ¡Agregá el primero!"
            : `Todavía no hay nadie en la lista. ¡Agregá la primera ${etiquetaAgregar}!`}
        </p>
      )}
      <ul>
        {items.map((it, idx) => (
          <li key={it.id} className="flex items-center gap-2 border-b border-line py-1.5 last:border-b-0">
            <input
              type="checkbox"
              className="check"
              checked={it.pagado}
              aria-label={`Marcar "${it.nombre}" como pagado`}
              onChange={(e) => mutar((l) => (l[idx].pagado = e.target.checked))}
            />
            <TextoInput
              valor={it.nombre}
              placeholder="Nombre del ítem"
              autoFocus={it.id === nuevo}
              onChange={(s) => mutar((l) => (l[idx].nombre = s))}
              className={`min-w-0 flex-1 ${it.pagado ? "text-muted line-through" : ""}`}
            />
            <MontoInput
              valor={montoItem(it, { montoBase })}
              onChange={(n) =>
                mutar((l) => {
                  l[idx].monto = n;
                  if (montoBase !== undefined) l[idx].manual = true;
                })
              }
              className="w-28 shrink-0"
              etiqueta={`Monto de ${it.nombre}`}
            />
            {montoBase !== undefined && it.manual && (
              <BotonIcono
                titulo="Volver al presupuesto general"
                icono="deshacer"
                onClick={() => mutar((l) => (l[idx].manual = false))}
              />
            )}
            <BotonIcono
              titulo="Eliminar ítem"
              icono="basura"
              peligro
              disabled={it.fijo}
              onClick={() => {
                if (confirmar(`¿Eliminar "${it.nombre || "este ítem"}"?`)) mutar((l) => l.splice(idx, 1));
              }}
            />
          </li>
        ))}
      </ul>
      <div className="mt-3">
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
