"use client";

import { totales } from "@/lib/calc";
import type { Presupuesto } from "@/lib/types";
import { Dinero } from "./ui";

export default function Resumen({ p }: { p: Presupuesto }) {
  const t = totales(p);
  const sobra = t.balance >= 0;
  return (
    <div
      className={`rounded-2xl p-4 text-white shadow-lg ${sobra ? "bg-emerald-600" : "bg-rose-600"}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium opacity-90">{sobra ? "Nos sobra" : "Nos falta"}</span>
        <Dinero n={Math.abs(t.balance)} className="text-3xl font-extrabold" />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex justify-between"><dt className="opacity-80">Ingresos</dt><dd><Dinero n={t.ingresos} className="font-semibold" /></dd></div>
        <div className="flex justify-between"><dt className="opacity-80">Gastos</dt><dd><Dinero n={t.planificado} className="font-semibold" /></dd></div>
        <div className="flex justify-between"><dt className="opacity-80">Pagado</dt><dd><Dinero n={t.pagado} className="font-semibold" /></dd></div>
        <div className="flex justify-between"><dt className="opacity-80">Pendiente</dt><dd><Dinero n={t.pendiente} className="font-semibold" /></dd></div>
      </dl>
    </div>
  );
}
