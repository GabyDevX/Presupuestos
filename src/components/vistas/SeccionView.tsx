"use client";

import { useState } from "react";
import { mover } from "@/lib/acciones";
import { nuevoId, totalesSeccion, totalSubseccion } from "@/lib/calc";
import type { Destino, Item, Seccion } from "@/lib/types";
import Destinos from "../Destinos";
import { Icono, ICONOS_SECCION, IconoSeccion } from "../icons";
import ItemsLista from "../ItemsLista";
import { Barra, BotonAgregar, BotonIcono, Dinero, MontoInput, TextoInput, Tarjeta, confirmar } from "../ui";

export default function SeccionView({
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
  const [editando, setEditando] = useState(false);
  const t = totalesSeccion(s, destinos);
  const cantItems = s.items.length + s.subsecciones.reduce((n, x) => n + x.items.length, 0);

  return (
    <div className="aparecer space-y-6">
      <div>
        <p className="flex items-baseline justify-between gap-3 text-sm text-muted">
          <span>
            Pagado <Dinero n={t.pagado} /> · Pendiente <Dinero n={t.pendiente} />
          </span>
          <Dinero n={t.planificado} className="text-2xl font-semibold text-fg" />
        </p>
        <Barra valor={t.pagado} total={t.planificado} tono="ok" className="mt-3" />
      </div>

      {s.nota !== undefined && (
        <textarea
          value={s.nota}
          onChange={(e) => mutarSeccion((x) => (x.nota = e.target.value))}
          placeholder="Notas de la sección…"
          aria-label={`Notas de ${s.nombre}`}
          rows={2}
          className="field text-sm"
        />
      )}

      {(s.items.length > 0 || (s.subsecciones.length === 0 && s.tipo !== "vacaciones")) && (
        <Tarjeta>
          <ItemsLista items={s.items} mutar={(fn) => mutarSeccion((x) => fn(x.items))} />
        </Tarjeta>
      )}

      {s.subsecciones.map((sub, si) => {
        const mutarSub = (fn: (items: Item[]) => void) => mutarSeccion((x) => fn(x.subsecciones[si].items));
        return (
          <Tarjeta key={sub.id}>
            <div className="flex items-center gap-1">
              <TextoInput
                valor={sub.nombre}
                placeholder="Nombre de la subsección"
                onChange={(v) => mutarSeccion((x) => (x.subsecciones[si].nombre = v))}
                className="min-w-0 flex-1 text-base font-semibold"
              />
              {editando && (
                <>
                  <BotonIcono titulo="Subir subsección" icono="arriba" disabled={si === 0} onClick={() => mutarSeccion((x) => mover(x.subsecciones, si, -1))} />
                  <BotonIcono titulo="Bajar subsección" icono="abajo" disabled={si === s.subsecciones.length - 1} onClick={() => mutarSeccion((x) => mover(x.subsecciones, si, 1))} />
                  <BotonIcono
                    titulo="Eliminar subsección"
                    icono="basura"
                    peligro
                    onClick={() => {
                      if (confirmar(`¿Eliminar la subsección "${sub.nombre || "sin nombre"}" con todos sus ítems?`))
                        mutarSeccion((x) => x.subsecciones.splice(si, 1));
                    }}
                  />
                </>
              )}
            </div>

            {sub.omitirTexto && (
              <label className="my-2 flex min-h-11 items-center gap-3 rounded-xl bg-raised px-3 text-sm">
                <input
                  type="checkbox"
                  className="check check-accent"
                  checked={!!sub.omitida}
                  onChange={(e) => mutarSeccion((x) => (x.subsecciones[si].omitida = e.target.checked))}
                />
                {sub.omitirTexto}
              </label>
            )}

            {sub.montoBase !== undefined && (
              <label className="my-2 flex items-center justify-between gap-3 rounded-xl bg-raised px-3 py-2.5 text-sm">
                <span>
                  <span className="block font-medium">Presupuesto general por {sub.etiquetaItem ?? "ítem"}</span>
                  <span className="block text-xs text-muted">Se aplica a todos; editá un monto para cambiar solo ese.</span>
                </span>
                <MontoInput
                  valor={sub.montoBase}
                  onChange={(n) => mutarSeccion((x) => (x.subsecciones[si].montoBase = n))}
                  className="w-32 shrink-0"
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
              <p className="mt-3 text-right text-xs text-muted">
                {sub.items.length} {sub.items.length === 1 ? "ítem" : "ítems"} · Subtotal{" "}
                <Dinero n={totalSubseccion(sub)} className="font-semibold text-fg" />
              </p>
            )}
          </Tarjeta>
        );
      })}

      {s.tipo === "vacaciones" && <Destinos destinos={destinos} balanceBase={balanceBase} mutar={mutarDestinos} />}

      <div className="flex flex-wrap items-center gap-3">
        <BotonAgregar onClick={() => mutarSeccion((x) => x.subsecciones.push({ id: nuevoId(), nombre: "", items: [] }))}>
          Agregar subsección
        </BotonAgregar>
        <button
          type="button"
          onClick={() => setEditando(!editando)}
          aria-pressed={editando}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
        >
          <Icono nombre="editar" className="h-4 w-4" />
          {editando ? "Listo" : "Editar sección"}
        </button>
      </div>

      {editando && (
        <Tarjeta className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted" htmlFor="nombre-seccion">Nombre</label>
            <input
              id="nombre-seccion"
              className="field"
              value={s.nombre}
              placeholder="Nombre de la sección"
              onChange={(e) => mutarSeccion((x) => (x.nombre = e.target.value))}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-xs text-muted">Ícono</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Ícono de la sección">
              {ICONOS_SECCION.map((clave) => (
                <button
                  key={clave}
                  type="button"
                  aria-pressed={s.emoji === clave}
                  aria-label={`Ícono ${clave}`}
                  onClick={() => mutarSeccion((x) => (x.emoji = clave))}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                    s.emoji === clave ? "border-accent bg-raised text-accent" : "border-line text-muted hover:text-fg"
                  }`}
                >
                  <IconoSeccion clave={clave} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 border-t border-line pt-3">
            <span className="mr-auto text-xs text-muted">Orden y eliminación</span>
            <BotonIcono titulo="Subir sección" icono="arriba" disabled={indice === 0} onClick={() => moverSeccion(-1)} />
            <BotonIcono titulo="Bajar sección" icono="abajo" disabled={indice === cantidad - 1} onClick={() => moverSeccion(1)} />
            <BotonIcono
              titulo="Eliminar sección"
              icono="basura"
              peligro
              onClick={() => {
                if (confirmar(`¿Eliminar la sección "${s.nombre || "sin nombre"}" con ${cantItems} ítem${cantItems === 1 ? "" : "s"}?`))
                  eliminarSeccion();
              }}
            />
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
