"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        window.location.href = "/";
        return;
      }
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "No se pudo entrar.");
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    }
    setCargando(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div className="text-center">
          <div className="text-4xl">🎄</div>
          <h1 className="mt-2 text-xl font-bold">Presupuesto de fin de año</h1>
          <p className="text-sm text-slate-500">Ingresá la contraseña compartida</p>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          disabled={cargando || !password}
          className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
