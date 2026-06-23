"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cambiarEstadoMovimiento } from "@/lib/actions/finanzas";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Resuelto = "pagado" | "cancelado";
export type MovimientoAPagar = { id: string; nombre: string; importe: number };

/**
 * Tarjeta de acción del Asistente (M6 · tool calling): la IA **identifica** un gasto
 * pendiente y propone marcarlo como pagado; el usuario lo confirma (ve cuál antes de
 * ejecutar). La escritura SOLO ocurre al confirmar: llama a `cambiarEstadoMovimiento`
 * (Server Action con auth + Zod que escribe en Notion).
 */
export function MarcarPagadoCard({
  movimiento,
  onResuelto,
}: {
  movimiento: MovimientoAPagar;
  onResuelto?: (estado: Resuelto) => void;
}) {
  const [resuelto, setResuelto] = useState<Resuelto | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = await cambiarEstadoMovimiento(movimiento.id, "Done");
      if (res.ok) {
        setResuelto("pagado");
        onResuelto?.("pagado");
      } else {
        setError(res.error);
      }
    });
  }

  if (resuelto) {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-income" />
        {resuelto === "pagado" ? "Marcado como pagado" : "Cancelado"}:{" "}
        <span className="font-medium text-foreground">{movimiento.nombre}</span>
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
            setResuelto("cancelado");
            onResuelto?.("cancelado");
          }}
        >
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
