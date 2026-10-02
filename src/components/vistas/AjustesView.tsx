"use client";

import { useEffect, useState } from "react";
import { guardarTema, leerTema, TEMAS, type Tema } from "@/lib/tema";
import { Icono } from "../icons";
import { Grupo, Titulo } from "../ui";

export default function AjustesView({ salir }: { salir: () => void }) {
  const [tema, setTema] = useState<Tema>("oscuro");
  useEffect(() => setTema(leerTema()), []);

  return (
    <div className="aparecer space-y-8">
      <section>
        <Titulo>Apariencia</Titulo>
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
      </section>

      <section>
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
      </section>
    </div>
  );
}
