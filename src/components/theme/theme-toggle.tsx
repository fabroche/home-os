"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** Botón circular para alternar tema claro/oscuro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // El tema real solo se conoce en cliente: hasta montar, render neutro y estable
  // para que el HTML del servidor y el del cliente coincidan (sin mismatch de hidratación).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- guard de montaje estándar de next-themes
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Cambiar tema"
      title={mounted ? (isDark ? "Tema claro" : "Tema oscuro") : "Cambiar tema"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "grid size-9 place-items-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground hover:bg-accent",
        className,
      )}
    >
      {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
