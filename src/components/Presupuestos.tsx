"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { borrarEjemplos as quitarEjemplos, hayEjemplos as tieneEjemplos, mover } from "@/lib/acciones";
import { nuevoId, totales } from "@/lib/calc";
import type { Destino, Ingreso, Presupuesto, Seccion } from "@/lib/types";
import Ingresos from "./Ingresos";
import Resumen from "./Resumen";
import SeccionCard from "./SeccionCard";
import { BotonAgregar, confirmar } from "./ui";

type Estado = "guardado" | "guardando" | "error";

export default function Presupuestos({ inicial }: { inicial: Presupuesto }) {
  const [p, setP] = useState(inicial);
  const [estado, setEstado] = useState<Estado>("guardado");
  const [aviso, setAviso] = useState("");

  const ref = useRef(p);
  const pendiente = useRef(false);
  const volando = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reemplazar = (nuevo: Presupuesto) => {
    ref.current = nuevo;
    setP(nuevo);
  };

  const guardar = useCallback(async () => {
    if (volando.current) return; // se reintenta al terminar el guardado en curso
    volando.current = true;
    pendiente.current = false;
    try {
      const cuerpo = JSON.stringify(ref.current);
      const r = await fetch("/api/presupuesto", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: cuerpo.length < 60_000, // sobrevive si se cierra la pestaña
      });
      if (r.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (r.status === 409) {
        const j = await r.json();
        reemplazar(j.data);
        pendiente.current = false;
        setEstado("guardado");
        setAviso("La otra persona había hecho cambios. Cargamos su versión; revisá si tenés que repetir algo.");
        return;
      }
      if (!r.ok) throw new Error();
      const { rev } = await r.json();
      reemplazar({ ...ref.current, rev });
      if (!pendiente.current) setEstado("guardado");
    } catch {
      pendiente.current = true;
      setEstado("error");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        void guardar();
      }, 5000);
    } finally {
      volando.current = false;
      if (pendiente.current && !timer.current) void guardar();
    }
  }, []);

  const cambiar = useCallback(
    (fn: (d: Presupuesto) => void) => {
      const copia = structuredClone(ref.current);
      fn(copia);
      reemplazar(copia);
      pendiente.current = true;
      setEstado("guardando");
      setAviso("");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        void guardar();
      }, 600);
    },
    [guardar],
  );

  // Trae los cambios de la otra persona al volver a la app y cada 30 s.
  useEffect(() => {
    const refrescar = async () => {
      if (pendiente.current || volando.current) return;
      try {
        const r = await fetch("/api/presupuesto", { cache: "no-store" });
        if (!r.ok) return;
        const { data } = await r.json();
        if (!pendiente.current && !volando.current && data.rev > ref.current.rev) reemplazar(data);
      } catch {
        /* sin conexión: se reintenta luego */
      }
    };
    const visible = () => document.visibilityState === "visible" && void refrescar();
    document.addEventListener("visibilitychange", visible);
    const iv = setInterval(visible, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      clearInterval(iv);
    };
  }, []);

  // Evita perder cambios sin guardar: al salir de la app (cambiar de app en el celular,
  // cerrar la pestaña) se guarda de inmediato sin esperar el retraso.
  useEffect(() => {
    const antes = (e: BeforeUnloadEvent) => {
      if (pendiente.current || volando.current) e.preventDefault();
    };
    const alOcultar = () => {
      if (document.visibilityState !== "hidden" || !pendiente.current) return;
      clearTimeout(timer.current);
      timer.current = undefined;
      void guardar();
    };
    window.addEventListener("beforeunload", antes);
    document.addEventListener("visibilitychange", alOcultar);
    return () => {
      window.removeEventListener("beforeunload", antes);
      document.removeEventListener("visibilitychange", alOcultar);
      clearTimeout(timer.current);
    };
  }, [guardar]);

  const hayEjemplos = tieneEjemplos(p);

  const borrarEjemplos = () => {
    if (!confirmar("¿Borrar todos los datos de ejemplo? Tus propios datos y la estructura se mantienen.")) return;
    cambiar(quitarEjemplos);
  };

  const salir = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const balanceBase = totales(p).balanceSinDestinos;

  const estadoGuardado = (
    <div className="flex items-center justify-between px-1 text-xs text-slate-500">
      <span>
        {estado === "guardando" && "Guardando…"}
        {estado === "guardado" && "✓ Guardado"}
        {estado === "error" && <span className="text-rose-600">Sin conexión, reintentando…</span>}
      </span>
      <button onClick={salir} className="underline">Salir</button>
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl px-3 pb-24 lg:max-w-6xl lg:px-6">
      {/* Celular: el resumen queda fijo arriba mientras se scrollea */}
      <div className="sticky top-0 z-10 -mx-3 bg-slate-100/95 px-3 pb-2 pt-3 backdrop-blur lg:hidden">
        <Resumen p={p} />
        <div className="mt-1">{estadoGuardado}</div>
      </div>

      <header className="mt-2 lg:mt-6">
        <h1 className="text-2xl font-extrabold">Presupuesto de fin de año</h1>
        <p className="text-sm text-slate-500">Navidad, Año Nuevo y enero</p>
      </header>

      {aviso && (
        <div className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">{aviso}</div>
      )}

      {hayEjemplos && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span>Hay datos de <b>ejemplo</b> (ficticios) para que pruebes la app.</span>
          <button
            onClick={borrarEjemplos}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white"
          >
            Borrar ejemplos
          </button>
        </div>
      )}

      {/* Computadora: resumen e ingresos en una columna fija a la izquierda, gastos a la derecha */}
      <div className="mt-4 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pr-1">
          <div className="hidden space-y-1 lg:block">
            <Resumen p={p} />
            {estadoGuardado}
          </div>
          <Ingresos
            ingresos={p.ingresos}
            mutar={(fn: (l: Ingreso[]) => void) => cambiar((d) => fn(d.ingresos))}
          />
        </aside>

        <div className="mt-4 space-y-4 lg:mt-0">
          <h2 className="pt-2 text-lg font-bold lg:pt-0">🧾 Gastos</h2>

          {p.secciones.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
              No hay secciones. Creá la primera con el botón de abajo.
            </p>
          )}

          {p.secciones.map((s, i) => (
            <SeccionCard
              key={s.id}
              seccion={s}
              indice={i}
              cantidad={p.secciones.length}
              destinos={p.destinos}
              balanceBase={balanceBase}
              mutarSeccion={(fn: (s: Seccion) => void) => cambiar((d) => fn(d.secciones[i]))}
              moverSeccion={(dir) => cambiar((d) => mover(d.secciones, i, dir))}
              eliminarSeccion={() => cambiar((d) => d.secciones.splice(i, 1))}
              mutarDestinos={(fn: (l: Destino[]) => void) => cambiar((d) => fn(d.destinos))}
            />
          ))}

          <div className="flex justify-center">
            <BotonAgregar
              onClick={() =>
                cambiar((d) =>
                  d.secciones.push({ id: nuevoId(), nombre: "Nueva sección", emoji: "📌", items: [], subsecciones: [] }),
                )
              }
            >
              Agregar sección
            </BotonAgregar>
          </div>
        </div>
      </div>
    </main>
  );
}
