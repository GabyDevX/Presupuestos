"use client";

import { useEffect } from "react";

/** Registra el service worker (solo en producción) para que la app sea instalable y tenga pantalla sin conexión. */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
