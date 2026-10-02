"use client";

import { nuevoId, totales, totalesSeccion } from "@/lib/calc";
import type { Presupuesto } from "@/lib/types";
import { Icono } from "../icons";
import { Barra, BotonAgregar, Dinero, Grupo, Insignia } from "../ui";

export default function GastosView({
  p,
  abrirSeccion,
  agregarSeccion,
}: {
  p: Presupuesto;
  abrirSeccion: (id: string) => void;
  agregarSeccion: (id: string) => void;
}) {
  const t = totales(p);
  return (
    <div className="aparecer space-y-5">
      <p className="px-1 text-sm text-muted">
        <Dinero n={t.pagado} className="font-medium text-fg" /> pagado de{" "}
        <Dinero n={t.planificado} className="font-medium text-fg" /> planificado
      </p>

      {p.secciones.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          No hay secciones. Creá la primera con el botón de abajo.
        </p>
      ) : (
        <Grupo>
          {p.secciones.map((s) => {
            const x = totalesSeccion(s, p.destinos);
            return (
              <button
                key={s.id}
                onClick={() => abrirSeccion(s.id)}
                className="flex min-h-[4.75rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
              >
                <Insignia clave={s.emoji} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{s.nombre || "Sin nombre"}</span>
                    <Dinero n={x.planificado} className="text-[15px] font-medium" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Pagado <Dinero n={x.pagado} /> · Pendiente <Dinero n={x.pendiente} />
                  </span>
                  <Barra valor={x.pagado} total={x.planificado} tono="ok" className="mt-2" />
                </span>
                <Icono nombre="siguiente" className="h-4 w-4 shrink-0 text-muted" />
              </button>
            );
          })}
        </Grupo>
      )}

      <BotonAgregar onClick={() => agregarSeccion(nuevoId())}>Agregar sección</BotonAgregar>
    </div>
  );
}
