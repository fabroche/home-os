"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">home-os</h1>
        <p className="text-sm text-muted-foreground">Inicia sesión para continuar.</p>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {state?.error && <p className="text-sm text-[var(--expense)]">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
