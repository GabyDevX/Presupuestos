"use client";

import { useCallback, useEffect, useState } from "react";
import { hashPresupuesto, presupuestoDeHash } from "@/lib/ruta";
import type { ItemLista } from "@/lib/presupuestos";
import type { Presupuesto } from "@/lib/types";
import ListaPresupuestos from "./ListaPresupuestos";
import Presupuestos from "./Presupuestos";

type Carga =
  | { estado: "cargando" }
  | { estado: "listo"; doc: Presupuesto }
  | { estado: "noexiste" }
  | { estado: "error" };

function Abierto({ id, irALista }: { id: string; irALista: () => void }) {
  const [carga, setCarga] = useState<Carga>({ estado: "cargando" });

  const cargar = useCallback(async () => {
    setCarga({ estado: "cargando" });
    try {
      const r = await fetch(`/api/presupuestos/${id}`, { cache: "no-store" });
      if (r.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (r.status === 404) return setCarga({ estado: "noexiste" });
      if (!r.ok) throw new Error();
      setCarga({ estado: "listo", doc: (await r.json()).data });
    } catch {
      setCarga({ estado: "error" });
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (carga.estado === "listo") {
    return <Presupuestos key={id} id={id} inicial={carga.doc} base={hashPresupuesto(id)} irALista={irALista} />;
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      {carga.estado === "cargando" && <p className="text-muted" role="status">Cargando…</p>}
      {carga.estado === "noexiste" && (
        <>
          <p>Ese presupuesto ya no existe.</p>
          <button onClick={irALista} className="min-h-11 rounded-xl bg-accent px-5 font-medium text-accent-fg">
            Ver mis presupuestos
          </button>
        </>
      )}
      {carga.estado === "error" && (
        <>
          <p>No se pudo cargar. Revisá tu conexión.</p>
          <div className="flex gap-3">
            <button onClick={cargar} className="min-h-11 rounded-xl bg-accent px-5 font-medium text-accent-fg">
              Reintentar
            </button>
            <button onClick={irALista} className="min-h-11 rounded-xl border border-line px-5">
              Volver
            </button>
          </div>
        </>
      )}
    </main>
  );
}

/** Decide entre la lista de presupuestos y un presupuesto abierto según el link (hash). */
export default function Aplicacion({ listaInicial }: { listaInicial: ItemLista[] }) {
  const [id, setId] = useState<string | null | undefined>(undefined); // undefined = todavía no se leyó el link

  useEffect(() => {
    const leer = () => setId(presupuestoDeHash(window.location.hash));
    leer();
    window.addEventListener("popstate", leer);
    return () => window.removeEventListener("popstate", leer);
  }, []);

  const abrir = useCallback((destino: string | null) => {
    window.history.pushState(null, "", destino ? hashPresupuesto(destino) : "#/");
    setId(destino);
    window.scrollTo(0, 0);
  }, []);

  if (id === undefined) return null;
  if (id) return <Abierto id={id} irALista={() => abrir(null)} />;
  return <ListaPresupuestos listaInicial={listaInicial} abrir={abrir} />;
}
