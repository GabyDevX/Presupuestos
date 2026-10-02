"use client";

import { totales } from "@/lib/calc";
import type { Presupuesto } from "@/lib/types";
import { Dinero } from "./ui";

/** Balance siempre visible. Los cuatro totales quedan disponibles para lectores de pantalla. */
export default function BalancePill({ p }: { p: Presupuesto }) {
  const t = totales(p);
  const sobra = t.balance >= 0;
  return (
    <div
      role="status"
      aria-live="polite"
      data-estado={sobra ? "sobra" : "falta"}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm ${
        sobra ? "bg-okbg text-ok" : "bg-badbg text-bad"
      }`}
    >
      <span data-testid="balance-label">{sobra ? "Nos sobra" : "Nos falta"}</span>
      <span data-testid="balance-monto" className="font-semibold">
        <Dinero n={Math.abs(t.balance)} />
      </span>
      <dl className="sr-only">
        <div><dt>Ingresos</dt><dd><Dinero n={t.ingresos} /></dd></div>
        <div><dt>Gastos</dt><dd><Dinero n={t.planificado} /></dd></div>
        <div><dt>Pagado</dt><dd><Dinero n={t.pagado} /></dd></div>
        <div><dt>Pendiente</dt><dd><Dinero n={t.pendiente} /></dd></div>
      </dl>
    </div>
  );
}
