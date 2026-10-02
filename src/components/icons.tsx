const P: Record<string, React.ReactNode> = {
  resumen: (<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  gastos: (<><path d="M9 6h12M9 12h12M9 18h12" /><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" /></>),
  ingresos: (<><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a1 1 0 0 1 1 1v2.5" /><path d="M3 7.5V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z" /></>),
  ajustes: (<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>),
  volver: <path d="M15 5l-7 7 7 7" />,
  siguiente: <path d="M9 5l7 7-7 7" />,
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  arriba: <path d="M12 19V5M6 11l6-6 6 6" />,
  abajo: <path d="M12 5v14M6 13l6 6 6-6" />,
  deshacer: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  editar: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />,
  basura: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />,
  salir: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
};

const SECCION: Record<string, React.ReactNode> = {
  "🚗": (<><path d="M3 16h18v3H3z" /><path d="M5 16l1.6-5.2A2 2 0 0 1 8.5 9.4h7a2 2 0 0 1 1.9 1.4L19 16" /><circle cx="7.5" cy="19" r="1.2" /><circle cx="16.5" cy="19" r="1.2" /></>),
  "🏠": <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  "🎄": (<><path d="M12 3l5 6h-3l4 5h-4l3 4H7l3-4H6l4-5H7z" /><path d="M12 18v3" /></>),
  "🎆": <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />,
  "🎂": (<><path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" /><path d="M8 12V9M12 12V8M16 12V9" /></>),
  "🏖️": (<><path d="M3 12a9 9 0 0 1 18 0H3z" /><path d="M12 12v7a2 2 0 0 0 4 0" /></>),
  "📌": <path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3z" />,
};

/** Íconos que se pueden elegir para una sección (la clave es el valor guardado). */
export const ICONOS_SECCION = Object.keys(SECCION);

export function IconoSeccion({ clave, className = "h-5 w-5" }: { clave: string; className?: string }) {
  const p = SECCION[clave];
  if (!p) return <span aria-hidden="true">{clave || "•"}</span>;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {p}
    </svg>
  );
}

export type NombreIcono = keyof typeof P;

export function Icono({ nombre, className = "h-5 w-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[nombre]}
    </svg>
  );
}
