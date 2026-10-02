"use client";

import { useEffect, useState } from "react";
import { guardarTema, leerTema, TEMAS, type Tema } from "@/lib/tema";
import { Icono } from "../icons";
import { Grupo, Titulo } from "../ui";

export function SeccionApariencia() {
  const [tema, setTema] = useState<Tema>("oscuro");
  useEffect(() => setTema(leerTema()), []);

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1">
      {TEMAS.map((t) => (
        <button
          key={t.valor}
          role="radio"
          aria-checked={tema === t.valor}
          onClick={() => {
            setTema(t.valor);
            guardarTema(t.valor);
          }}
          className={`min-h-11 rounded-xl text-sm font-medium transition-colors ${
            tema === t.valor ? "bg-raised text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {t.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function SeccionCuenta({ salir }: { salir: () => void }) {
  return (
    <>
      <Titulo>Cuenta</Titulo>
      <Grupo>
        <button
          onClick={salir}
          className="flex min-h-14 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-raised"
        >
          <Icono nombre="salir" className="h-5 w-5 text-muted" />
          <span>Salir</span>
        </button>
      </Grupo>
      <p className="mt-3 px-1 text-xs text-muted">
        Los cambios se guardan solos y se comparten con la otra persona. Si dejás la app abierta, se actualiza cada 30 segundos.
      </p>
    </>
  );
}

export default function AjustesView({
  salir,
  nombre,
  cambiarNombre,
  archivado,
  archivar,
  eliminar,
}: {
  salir: () => void;
  nombre: string;
  cambiarNombre: (n: string) => void;
  archivado: boolean;
  archivar: (v: boolean) => void;
  eliminar: () => void;
}) {
  return (
    <div className="aparecer space-y-8">
      <section>
        <Titulo>Este presupuesto</Titulo>
        <label htmlFor="nombre-presupuesto" className="mb-1.5 block px-1 text-xs text-muted">Nombre</label>
        <input
          id="nombre-presupuesto"
          className="field"
          value={nombre}
          maxLength={120}
          placeholder="Nombre del presupuesto"
          onChange={(e) => cambiarNombre(e.target.value)}
        />
        <label className="mt-3 flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm">
          <input
            type="checkbox"
            className="check check-accent"
            checked={archivado}
            onChange={(e) => archivar(e.target.checked)}
          />
          <span>
            Archivado
            <span className="block text-xs text-muted">Sale de la lista principal, pero no se pierde.</span>
          </span>
        </label>
        <button
          onClick={eliminar}
          className="mt-2 flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-bad transition-opacity hover:opacity-80"
        >
          <Icono nombre="basura" className="h-4 w-4" />
          Eliminar este presupuesto
        </button>
      </section>

      <section>
        <Titulo>Apariencia</Titulo>
        <SeccionApariencia />
      </section>

      <section>
        <SeccionCuenta salir={salir} />
      </section>
    </div>
  );
}
