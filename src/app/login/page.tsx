"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Credenciales incorrectas.");
      setPending(false);
      return;
    }
    // Navegación completa → el middleware ve la cookie de sesión recién creada.
    window.location.assign("/");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <div className="glow-bg" aria-hidden />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-soft"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            h
          </span>
          <span className="text-lg font-semibold tracking-tight">home·os</span>
        </div>

        <div>
          <h1 className="text-2xl">
            Hola de <span className="serif-accent text-primary">nuevo</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Inicia sesión para continuar.</p>
        </div>

        <div className="space-y-3">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Contraseña"
            className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {error && <p className="text-sm text-expense">{error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
