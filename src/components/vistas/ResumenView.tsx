"use client";

import { hayEjemplos } from "@/lib/acciones";
import { cronograma, totales, totalesSeccion } from "@/lib/calc";
import { formatoFecha } from "@/lib/fechas";
import { NOMBRES_PERSONA, type Presupuesto } from "@/lib/types";
import { Icono } from "../icons";
import { Barra, Dinero, Grupo, Insignia, Titulo } from "../ui";

export default function ResumenView({
  p,
  abrirSeccion,
  verIngresos,
  borrarEjemplos,
}: {
  p: Presupuesto;
  abrirSeccion: (id: string) => void;
  verIngresos: () => void;
  borrarEjemplos: () => void;
}) {
  const t = totales(p);
  const sobra = t.balance >= 0;
  const usado = t.ingresos > 0 ? Math.round((t.planificado / t.ingresos) * 100) : t.planificado > 0 ? 100 : 0;
  const porCategoria = p.secciones.map((s) => ({ s, ...totalesSeccion(s, p.destinos) }));
  const cobros = cronograma(p.ingresos).slice(0, 4);

  return (
    <div className="aparecer space-y-8">
      {hayEjemplos(p) && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-warnbg p-4 text-sm text-warn">
          <span>Hay datos de <b>ejemplo</b> (ficticios) para que pruebes la app.</span>
          <button
            onClick={borrarEjemplos}
            className="min-h-11 shrink-0 rounded-xl bg-warn px-4 font-medium text-canvas transition-opacity hover:opacity-90"
          >
            Borrar ejemplos
          </button>
        </div>
      )}

      <section aria-label="Balance">
        <h2 className="text-3xl font-semibold tracking-tight">
          {sobra ? "Nos sobran " : "Nos faltan "}
          <Dinero n={Math.abs(t.balance)} className={sobra ? "text-ok" : "text-bad"} />
        </h2>
        <p className="mt-1 text-sm text-muted">
          {t.ingresos === 0 && t.planificado === 0
            ? "Cargá los ingresos y los gastos para ver el balance."
            : `Planificado: ${usado}% de los ingresos.`}
        </p>
        <Barra valor={t.planificado} total={t.ingresos || t.planificado} tono={sobra ? "accent" : "bad"} className="mt-4" />
        <dl className="mt-5 divide-y divide-line text-[15px]">
          {[
            ["Ingresos", t.ingresos],
            ["Gastos planificados", t.planificado],
            ["Pagado", t.pagado],
            ["Pendiente de pagar", t.pendiente],
          ].map(([k, v]) => (
            <div key={k as string} className="flex items-center justify-between py-3">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium"><Dinero n={v as number} /></dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <Titulo>Por categoría</Titulo>
        {porCategoria.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
            Todavía no hay categorías. Creá la primera desde Gastos.
          </p>
        ) : (
          <Grupo>
            {porCategoria.map(({ s, planificado }) => (
              <button
                key={s.id}
                onClick={() => abrirSeccion(s.id)}
                className="flex min-h-[4.25rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
              >
                <Insignia clave={s.emoji} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{s.nombre || "Sin nombre"}</span>
                    <Dinero n={planificado} className="text-[15px]" />
                  </span>
                  <Barra valor={planificado} total={t.planificado} className="mt-2" />
                </span>
                <Icono nombre="siguiente" className="h-4 w-4 shrink-0 text-muted" />
              </button>
            ))}
          </Grupo>
        )}
      </section>

      <section>
        <Titulo
          extra={
            <button onClick={verIngresos} className="min-h-11 px-1 text-sm font-medium text-accent">
              Ver todos
            </button>
          }
        >
          Cobros
        </Titulo>
        {cobros.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
            Todavía no cargaste ingresos.
          </p>
        ) : (
          <Grupo>
            {cobros.map(({ ingreso: i }) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-14 shrink-0 text-sm text-muted">{formatoFecha(i.fecha)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{i.nombre || "Sin nombre"}</span>
                  <span className="block text-xs text-muted">{NOMBRES_PERSONA[i.persona]}</span>
                </span>
                <Dinero n={i.monto} className="font-medium" />
              </div>
            ))}
          </Grupo>
        )}
      </section>
    </div>
  );
}
