"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { borrarEjemplos as quitarEjemplos, mover } from "@/lib/acciones";
import { totales } from "@/lib/calc";
import { parseRuta, rutaAHash, type Ruta, type Tab } from "@/lib/ruta";
import type { Destino, Ingreso, Presupuesto, Seccion } from "@/lib/types";
import BalancePill from "./BalancePill";
import { Icono, type NombreIcono } from "./icons";
import { confirmar } from "./ui";
import AjustesView from "./vistas/AjustesView";
import GastosView from "./vistas/GastosView";
import IngresosView from "./vistas/IngresosView";
import ResumenView from "./vistas/ResumenView";
import SeccionView from "./vistas/SeccionView";

const NAV: { tab: Tab; etiqueta: string; icono: NombreIcono }[] = [
  { tab: "resumen", etiqueta: "Resumen", icono: "resumen" },
  { tab: "gastos", etiqueta: "Gastos", icono: "gastos" },
  { tab: "ingresos", etiqueta: "Ingresos", icono: "ingresos" },
  { tab: "ajustes", etiqueta: "Ajustes", icono: "ajustes" },
];

const TITULOS: Record<Tab, string> = {
  resumen: "Resumen",
  gastos: "Gastos",
  ingresos: "Ingresos",
  ajustes: "Ajustes",
};

type Estado = "guardado" | "guardando" | "error";

export default function Presupuestos({
  inicial,
  id = "inicial",
  base = "",
  irALista = () => {},
}: {
  inicial: Presupuesto;
  /** Id del presupuesto en el servidor. */
  id?: string;
  /** Prefijo del hash de este presupuesto (ej. "#/p/abc"). */
  base?: string;
  irALista?: () => void;
}) {
  const [p, setP] = useState(inicial);
  const [estado, setEstado] = useState<Estado>("guardado");
  const [aviso, setAviso] = useState("");
  const [ruta, setRuta] = useState<Ruta>({ tab: "resumen" });

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
      const r = await fetch(`/api/presupuestos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: cuerpo.length < 60_000, // sobrevive si se cierra la pestaña
      });
      if (r.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (r.status === 404) {
        // Lo eliminaron desde otro lado.
        pendiente.current = false;
        irALista();
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
        const r = await fetch(`/api/presupuestos/${id}`, { cache: "no-store" });
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

  // Navegación con historial del navegador: el botón "atrás" y los links directos funcionan.
  useEffect(() => {
    setRuta(parseRuta(window.location.hash, base));
    const alCambiar = () => setRuta(parseRuta(window.location.hash, base));
    window.addEventListener("popstate", alCambiar);
    return () => window.removeEventListener("popstate", alCambiar);
  }, [base]);

  const ir = useCallback((r: Ruta) => {
    window.history.pushState(null, "", rutaAHash(r, base));
    setRuta(r);
    window.scrollTo(0, 0);
  }, [base]);

  const borrarEjemplos = () => {
    if (!confirmar("¿Borrar todos los datos de ejemplo? Tus propios datos y la estructura se mantienen.")) return;
    cambiar(quitarEjemplos);
  };

  const eliminarPresupuesto = async () => {
    if (!confirmar(`¿Eliminar "${p.nombre || "este presupuesto"}"? Se pierden todos sus datos y no se puede deshacer.`)) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    pendiente.current = false;
    try {
      const r = await fetch(`/api/presupuestos/${id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 404) throw new Error();
      irALista();
    } catch {
      setAviso("No se pudo eliminar. Revisá tu conexión y probá de nuevo.");
    }
  };

  const salir = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const balanceBase = totales(p).balanceSinDestinos;
  const indiceSeccion = ruta.seccionId ? p.secciones.findIndex((s) => s.id === ruta.seccionId) : -1;
  const seccion = indiceSeccion >= 0 ? p.secciones[indiceSeccion] : undefined;
  const enDetalle = ruta.tab === "gastos" && !!seccion;
  const enRaiz = ruta.tab === "resumen" && !enDetalle;
  const titulo = enDetalle ? seccion!.nombre || "Sin nombre" : enRaiz ? p.nombre || "Sin nombre" : TITULOS[ruta.tab];

  const indicadorGuardado = (
    <span className="flex items-center gap-2 text-xs text-muted">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${
          estado === "guardado" ? "bg-ok" : estado === "guardando" ? "animate-pulse bg-warn" : "bg-bad"
        }`}
      />
      {estado === "guardando" && "Guardando…"}
      {estado === "guardado" && <span className="sr-only">✓ Guardado</span>}
      {estado === "error" && <span className="text-bad">Sin conexión, reintentando…</span>}
    </span>
  );

  const botonNav = (n: (typeof NAV)[number], clase: string) => {
    const activo = ruta.tab === n.tab;
    return (
      <button
        key={n.tab}
        onClick={() => ir({ tab: n.tab })}
        aria-current={activo ? "page" : undefined}
        className={`${clase} ${activo ? "text-accent" : "text-muted hover:text-fg"}`}
      >
        <Icono nombre={n.icono} className="h-[22px] w-[22px]" />
        <span>{n.etiqueta}</span>
      </button>
    );
  };

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Computadora: barra lateral */}
      <nav
        aria-label="Principal"
        className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-surface p-4 lg:flex"
      >
        <button
          onClick={irALista}
          className="mb-4 flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-lg font-semibold tracking-tight transition-colors hover:bg-raised"
        >
          <Icono nombre="volver" className="h-4 w-4 text-muted" />
          Presupuestos
        </button>
        <div className="flex flex-col gap-1">
          {NAV.map((n) =>
            botonNav(n, "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors hover:bg-raised"),
          )}
        </div>
        <div className="mt-auto px-3 pb-2">{indicadorGuardado}</div>
      </nav>

      <div className="mx-auto w-full max-w-2xl px-4">
        <header className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-canvas px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {enRaiz && (
            <button
              onClick={irALista}
              aria-label="Volver a Presupuestos"
              className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <Icono nombre="volver" />
            </button>
          )}
          {enDetalle && (
            <button
              onClick={() => ir({ tab: "gastos" })}
              aria-label="Volver a Gastos"
              className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <Icono nombre="volver" />
            </button>
          )}
          <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">{titulo}</h1>
          <span className="lg:hidden">{indicadorGuardado}</span>
          <BalancePill p={p} />
        </header>

        <main className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-2 lg:pb-16">
          {aviso && (
            <div className="mb-5 rounded-2xl bg-warnbg p-4 text-sm text-warn" role="alert">
              {aviso}
            </div>
          )}

          {ruta.tab === "resumen" && (
            <ResumenView
              p={p}
              abrirSeccion={(id) => ir({ tab: "gastos", seccionId: id })}
              verIngresos={() => ir({ tab: "ingresos" })}
              borrarEjemplos={borrarEjemplos}
            />
          )}

          {ruta.tab === "gastos" && !seccion && (
            <GastosView
              p={p}
              abrirSeccion={(id) => ir({ tab: "gastos", seccionId: id })}
              agregarSeccion={(id) => {
                cambiar((d) => d.secciones.push({ id, nombre: "Nueva sección", emoji: "📌", items: [], subsecciones: [] }));
                ir({ tab: "gastos", seccionId: id });
              }}
            />
          )}

          {ruta.tab === "gastos" && seccion && (
            <SeccionView
              key={seccion.id}
              seccion={seccion}
              indice={indiceSeccion}
              cantidad={p.secciones.length}
              destinos={p.destinos}
              balanceBase={balanceBase}
              mutarSeccion={(fn: (s: Seccion) => void) => cambiar((d) => fn(d.secciones[indiceSeccion]))}
              moverSeccion={(dir) => cambiar((d) => mover(d.secciones, indiceSeccion, dir))}
              eliminarSeccion={() => {
                cambiar((d) => d.secciones.splice(indiceSeccion, 1));
                ir({ tab: "gastos" });
              }}
              mutarDestinos={(fn: (l: Destino[]) => void) => cambiar((d) => fn(d.destinos))}
            />
          )}

          {ruta.tab === "ingresos" && (
            <IngresosView ingresos={p.ingresos} mutar={(fn: (l: Ingreso[]) => void) => cambiar((d) => fn(d.ingresos))} />
          )}

          {ruta.tab === "ajustes" && (
            <AjustesView
              salir={salir}
              nombre={p.nombre}
              cambiarNombre={(n) => cambiar((d) => (d.nombre = n))}
              archivado={!!p.archivado}
              archivar={(v) => cambiar((d) => (d.archivado = v))}
              eliminar={eliminarPresupuesto}
            />
          )}
        </main>
      </div>

      {/* Celular: barra inferior */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map((n) =>
          botonNav(n, "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"),
        )}
      </nav>
    </div>
  );
}
