"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { borrarMovimiento, borrarDeuda } from "@/lib/actions/finanzas";
import type { ObjetivoBorrar } from "@/types/ai";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccionResuelta } from "@/components/asistente/chat-message";

/**
 * Tarjeta de acción del Asistente (M6 · tool calling): la IA **identifica** un movimiento
 * o deuda y propone borrarlo; el usuario confirma (ve qué se borra antes de ejecutar).
 * La escritura SOLO ocurre al confirmar: llama a `borrarMovimiento`/`borrarDeuda` (Server
 * Action con auth que archiva en Notion + soft-delete). La IA nunca borra por su cuenta.
 */
export function BorrarCard({
  objetivo,
  resueltoInicial,
  onResuelto,
}: {
  objetivo: ObjetivoBorrar;
  /** Estado resuelto persistido (al rehidratar): si está, la card nace congelada. */
  resueltoInicial?: AccionResuelta;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  // Resuelto efectivo = lo decidido aquí (local) o lo persistido/superado que llega por prop.
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cosa = objetivo.tipo === "movimiento" ? "movimiento" : "deuda";

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const accion = objetivo.tipo === "movimiento" ? borrarMovimiento : borrarDeuda;
      const res = await accion(objetivo.id);
      if (res.ok) {
        setResueltoLocal("borrado");
        onResuelto?.("borrado");
      } else {
        setError(res.error);
      }
    });
  }

  if (resuelto) {
    const etiqueta =
      resuelto === "borrado"
        ? "Borrado"
        : resuelto === "superado"
          ? "Descartado (lo reescribiste)"
          : "Cancelado";
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-income" />
        {etiqueta}: <span className="font-medium text-foreground">{objetivo.nombre}</span>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>Borrar {cosa}</CardLabel>
        <Badge tone="brand">{cosa}</Badge>
      </div>
      <p className="mt-2 text-sm">
        ¿Borro <span className="font-semibold">{objetivo.nombre}</span>? Se archiva en Notion (reversible).
      </p>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={confirmar}>
          Sí, borrar
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
