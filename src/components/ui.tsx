"use client";

import { formatoMoneda } from "@/lib/calc";

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
    <input
      type="number"
      inputMode="decimal"
      min={0}
      aria-label={etiqueta ?? "Monto"}
      value={valor || ""}
      placeholder="0"
      onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
      className={`rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right text-base tabular-nums ${className}`}
    />
  );
}

export function TextoInput({
  valor,
  onChange,
  placeholder,
  className = "",
  autoFocus,
}: {
  valor: string;
  onChange: (s: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={valor}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-base hover:border-slate-200 focus:border-slate-400 focus:bg-white focus:outline-none ${className}`}
    />
  );
}

export function BotonIcono({
  onClick,
  titulo,
  children,
  peligro,
  disabled,
}: {
  onClick: () => void;
  titulo: string;
  children: React.ReactNode;
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
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base disabled:opacity-30 ${
        peligro ? "text-rose-600 hover:bg-rose-50" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export function BotonAgregar({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      + {children}
    </button>
  );
}

export function Dinero({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatoMoneda(n)}</span>;
}

export const confirmar = (mensaje: string) => window.confirm(mensaje);

// Mueve el elemento `i` una posición (-1 arriba, +1 abajo).
export function mover<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
