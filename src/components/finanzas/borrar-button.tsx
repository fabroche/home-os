"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { borrarMovimiento, borrarDeuda } from "@/lib/actions/finanzas";
import { cn } from "@/lib/utils";

/**
 * Botón de borrado con confirmación en dos pasos (sin diálogos modales). Archiva en
 * Notion + soft-delete en Supabase vía Server Action; al refrescar, la fila desaparece.
 * Sirve para movimientos y deudas (`tipo`); recibe solo strings, así que también vale
 * desde un Server Component (la tabla de deudas).
 */
export function BorrarButton({
  tipo,
  pageId,
  nombre,
}: {
  tipo: "movimiento" | "deuda";
  pageId: string;
  /** Para la etiqueta accesible ("Borrar <nombre>"). */
  nombre?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function borrar() {
    setError(null);
    startTransition(async () => {
      const accion = tipo === "movimiento" ? borrarMovimiento : borrarDeuda;
      const res = await accion(pageId);
      if (!res.ok) {
        setError(res.error);
        setConfirmando(false);
      }
      // En éxito, revalidatePath refresca la lista y la fila desaparece.
    });
  }

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">¿Borrar?</span>
        <button
          type="button"
          onClick={borrar}
          disabled={pending}
          className="rounded-md px-2 py-0.5 font-medium text-expense hover:bg-expense/10 disabled:opacity-50"
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="rounded-md px-2 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        aria-label={nombre ? `Borrar ${nombre}` : "Borrar"}
        title="Borrar"
        className={cn(
          "inline-grid size-7 place-items-center rounded-md text-muted-foreground transition-colors",
          "hover:bg-expense/10 hover:text-expense max-md:size-9",
        )}
      >
        <Trash2 className="size-4" />
      </button>
      {error && <span className="text-xs text-expense">{error}</span>}
    </span>
  );
}
