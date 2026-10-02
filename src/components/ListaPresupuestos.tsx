"use client";

import { useEffect, useState } from "react";
import type { ItemLista } from "@/lib/presupuestos";
import { Icono } from "./icons";
import { SeccionApariencia, SeccionCuenta } from "./vistas/AjustesView";
import { Barra, BotonAgregar, Dinero, Grupo, Tarjeta, Titulo } from "./ui";

export default function ListaPresupuestos({
  listaInicial,
  abrir,
}: {
  listaInicial: ItemLista[];
  abrir: (id: string) => void;
}) {
  const [lista, setLista] = useState(listaInicial);
  const [creando, setCreando] = useState(listaInicial.length === 0);
  const [verArchivados, setVerArchivados] = useState(false);
  const [nombre, setNombre] = useState("");
  const [origen, setOrigen] = useState<string>(""); // "" = en blanco; si no, id a duplicar
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Al volver desde un presupuesto, los totales pueden haber cambiado.
  useEffect(() => {
    let vivo = true;
    fetch("/api/presupuestos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => vivo && j && setLista(j.items))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const activos = lista.filter((x) => !x.archivado);
  const archivados = lista.filter((x) => x.archivado);

  const abrirFormulario = () => {
    const ultimo = activos.at(-1) ?? lista.at(-1);
    setOrigen(ultimo?.id ?? "");
    setNombre("");
    setError("");
    setCreando(true);
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const r = await fetch("/api/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, desde: origen ? { tipo: "duplicar", id: origen } : { tipo: "blanco" } }),
      });
      if (r.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!r.ok) throw new Error();
      abrir((await r.json()).id);
    } catch {
      setError("No se pudo crear. Probá de nuevo.");
      setGuardando(false);
    }
  };

  const fila = (x: ItemLista) => (
    <button
      key={x.id}
      onClick={() => abrir(x.id)}
      className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{x.nombre || "Sin nombre"}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {x.balance >= 0 ? "Sobran" : "Faltan"} <Dinero n={Math.abs(x.balance)} className={x.balance >= 0 ? "text-ok" : "text-bad"} />
          {" · "}Gastos <Dinero n={x.planificado} />
        </span>
        <Barra valor={x.planificado} total={x.ingresos || x.planificado} tono={x.balance >= 0 ? "accent" : "bad"} className="mt-2" />
      </span>
      <Icono nombre="siguiente" className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="py-3 text-3xl font-semibold tracking-tight">Presupuestos</h1>

      <div className="aparecer space-y-8">
        {activos.length === 0 && !creando && (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
            Todavía no tenés presupuestos. Creá el primero.
          </p>
        )}

        {activos.length > 0 && <Grupo>{activos.map(fila)}</Grupo>}

        {creando ? (
          <Tarjeta>
            <form onSubmit={crear} className="space-y-4">
              <h2 className="font-semibold">Nuevo presupuesto</h2>
              <div>
                <label htmlFor="nombre-nuevo" className="mb-1.5 block text-xs text-muted">Nombre</label>
                <input
                  id="nombre-nuevo"
                  className="field"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Fin de año 2027"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="origen-nuevo" className="mb-1.5 block text-xs text-muted">Empezar desde</label>
                <select id="origen-nuevo" className="field" value={origen} onChange={(e) => setOrigen(e.target.value)}>
                  <option value="">En blanco</option>
                  {lista.map((x) => (
                    <option key={x.id} value={x.id}>
                      Copia de «{x.nombre || "Sin nombre"}»
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted">
                  {origen
                    ? "Se copian las categorías, los ítems y las personas, con los montos en 0 y nada pagado."
                    : "Empieza vacío, con una sola sección."}
                </p>
              </div>
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={guardando}
                  className="min-h-11 rounded-xl bg-accent px-5 font-medium text-accent-fg transition-opacity disabled:opacity-50"
                >
                  {guardando ? "Creando…" : "Crear"}
                </button>
                {lista.length > 0 && (
                  <button type="button" onClick={() => setCreando(false)} className="min-h-11 rounded-xl px-4 text-muted hover:bg-raised">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </Tarjeta>
        ) : (
          <BotonAgregar onClick={abrirFormulario}>Nuevo presupuesto</BotonAgregar>
        )}

        {archivados.length > 0 && (
          <section>
            <button
              onClick={() => setVerArchivados(!verArchivados)}
              aria-expanded={verArchivados}
              className="mb-2 flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-muted"
            >
              Archivados ({archivados.length})
            </button>
            {verArchivados && <Grupo>{archivados.map(fila)}</Grupo>}
          </section>
        )}

        <section>
          <Titulo>Apariencia</Titulo>
          <SeccionApariencia />
        </section>
        <section>
          <SeccionCuenta
            salir={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          />
        </section>
      </div>
    </main>
  );
}
