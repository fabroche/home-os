"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cambiarEstadoMovimiento } from "@/lib/actions/finanzas";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccionResuelta } from "@/components/asistente/chat-message";

export type MovimientoAPagar = { id: string; nombre: string; importe: number };

/**
 * Tarjeta de acción del Asistente (M6 · tool calling): la IA **identifica** un gasto
 * pendiente y propone marcarlo como pagado; el usuario lo confirma (ve cuál antes de
 * ejecutar). La escritura SOLO ocurre al confirmar: llama a `cambiarEstadoMovimiento`
 * (Server Action con auth + Zod que escribe en Notion).
 */
export function MarcarPagadoCard({
  movimiento,
  resueltoInicial,
  onResuelto,
}: {
  movimiento: MovimientoAPagar;
  /** Estado resuelto persistido (al rehidratar): si está, la card nace congelada. */
  resueltoInicial?: AccionResuelta;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  // Resuelto efectivo = lo decidido aquí (local) o lo persistido/superado que llega por prop.
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = await cambiarEstadoMovimiento(movimiento.id, "Done");
      if (res.ok) {
        setResueltoLocal("pagado");
        onResuelto?.("pagado");
      } else {
        setError(res.error);
      }
    });
  }

  if (resuelto) {
    const etiqueta =
      resuelto === "pagado"
        ? "Marcado como pagado"
        : resuelto === "superado"
          ? "Descartado (lo reescribiste)"
          : "Cancelado";
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-income" />
        {etiqueta}: <span className="font-medium text-foreground">{movimiento.nombre}</span>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>Marcar como pagado</CardLabel>
        <Badge tone="brand">{movimiento.importe.toFixed(2)} €</Badge>
      </div>
      <p className="mt-2 text-sm">
        ¿Marco como pagado <span className="font-semibold">{movimiento.nombre}</span>?
      </p>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={confirmar}>
          Sí, marcar pagado
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setResueltoLocal("cancelado");
            onResuelto?.("cancelado");
          }}
        >
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
