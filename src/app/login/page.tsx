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
      <form onSubmit={entrar} className="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-surface p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
          <p className="mt-1 text-sm text-muted">Ingresá la contraseña compartida.</p>
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs text-muted">Contraseña</label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>
        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        <button
          disabled={cargando || !password}
          className="min-h-12 w-full rounded-xl bg-accent font-semibold text-accent-fg transition-opacity disabled:opacity-50"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
