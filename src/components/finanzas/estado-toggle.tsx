"use client";

import { useState, useTransition } from "react";
import { Check, Clock } from "lucide-react";
import { cambiarEstadoMovimiento } from "@/lib/actions/finanzas";
import { cn } from "@/lib/utils";

/**
 * Toggle del estado de un movimiento (Pending↔Done) escribiendo en Notion.
 * Etiquetas en clave de pago (Pendiente / Pagado).
 */
export function EstadoToggle({ pageId, estado }: { pageId: string; estado: string | null }) {
  const [current, setCurrent] = useState(estado);
  const [pending, startTransition] = useTransition();
  const isDone = current === "Done";

  function toggle() {
    const next = isDone ? "Pending" : "Done";
    startTransition(async () => {
      const res = await cambiarEstadoMovimiento(pageId, next);
      if (res.ok) setCurrent(next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title="Cambiar estado de pago"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        isDone
          ? "bg-[color-mix(in_oklab,var(--income)_15%,transparent)] text-income"
          : "bg-secondary text-muted-foreground hover:text-foreground",
        pending && "opacity-50",
      )}
    >
      {isDone ? <Check className="size-3" /> : <Clock className="size-3" />}
      {isDone ? "Pagado" : "Pendiente"}
    </button>
  );
}
