"use client";

import { formatoMoneda } from "@/lib/calc";
import { Icono, IconoSeccion, type NombreIcono } from "./icons";

export function MontoInput({
  valor,
  onChange,
  className = "",
  etiqueta,
}: {
  valor: number;
  onChange: (n: number) => void;
  className?: string;
  etiqueta?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        aria-label={etiqueta ?? "Monto"}
        value={valor || ""}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        className="field pl-7 text-right tabular-nums"
      />
    </div>
  );
}

export function TextoInput({
  valor,
  onChange,
  placeholder,
  className = "",
  autoFocus,
  etiqueta,
}: {
  valor: string;
  onChange: (s: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  etiqueta?: string;
}) {
  return (
    <input
      type="text"
      value={valor}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={etiqueta}
      onChange={(e) => onChange(e.target.value)}
      className={`field ghost ${className}`}
    />
  );
}

export function BotonIcono({
  onClick,
  titulo,
  icono,
  peligro,
  disabled,
}: {
  onClick: () => void;
  titulo: string;
  icono: NombreIcono;
  peligro?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      disabled={disabled}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-default disabled:opacity-25 ${
        peligro ? "text-muted hover:bg-badbg hover:text-bad" : "text-muted hover:bg-raised hover:text-fg"
      }`}
    >
      <Icono nombre={icono} className="h-[18px] w-[18px]" />
    </button>
  );
}

export function BotonAgregar({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3.5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <Icono nombre="mas" className="h-4 w-4" />
      {children}
    </button>
  );
}

export function Dinero({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatoMoneda(n)}</span>;
}

/** Barra de progreso fina. `valor` y `total` en las mismas unidades. */
export function Barra({
  valor,
  total,
  tono = "accent",
  className = "",
}: {
  valor: number;
  total: number;
  tono?: "accent" | "ok" | "bad";
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (valor / total) * 100)) : 0;
  const color = tono === "ok" ? "bg-ok" : tono === "bad" ? "bg-bad" : "bg-accent";
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-raised ${className}`} aria-hidden="true">
      <div className={`h-full rounded-full transition-[width] duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</section>;
}

export function Titulo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h2 className="text-sm font-medium text-muted">{children}</h2>
      {extra}
    </div>
  );
}

/** Lista agrupada: una sola superficie con filas separadas por líneas finas. */
export function Grupo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line ${className}`}>
      {children}
    </div>
  );
}

/** Ícono de una sección dentro de un recuadro neutro. */
export function Insignia({ clave }: { clave: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-fg">
      <IconoSeccion clave={clave} />
    </span>
  );
}

export const confirmar = (mensaje: string) => window.confirm(mensaje);
