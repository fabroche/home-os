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
 * Tarjeta de acción del Asistente (M6 · tool calling): la IA propone marcar un gasto como
 * pagado. Dos modos: un único `movimiento` (va directo a confirmar) o varios `candidatos`
 * (cuando la petición es ambigua, ej. "marca pagado un gasto de comida"): el usuario ELIGE
 * cuál y luego confirma. La escritura SOLO ocurre al confirmar (`cambiarEstadoMovimiento`);
 * la IA nunca ejecuta por su cuenta.
 */
export function MarcarPagadoCard({
  movimiento,
  candidatos,
  resueltoInicial,
  onResuelto,
}: {
  movimiento?: MovimientoAPagar;
  candidatos?: MovimientoAPagar[];
  /** Estado resuelto persistido (al rehidratar): si está, la card nace congelada. */
  resueltoInicial?: AccionResuelta;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  // Resuelto efectivo = lo decidido aquí (local) o lo persistido/superado que llega por prop.
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  // En modo lista, el item elegido por el usuario (pasa al paso de confirmación).
  const [seleccion, setSeleccion] = useState<MovimientoAPagar | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const elegido = seleccion ?? movimiento ?? null;
  const hayLista = !elegido && !!candidatos?.length;

  function confirmar(item: MovimientoAPagar) {
    setError(null);
    startTransition(async () => {
      const res = await cambiarEstadoMovimiento(item.id, "Done");
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
        {etiqueta}: <span className="font-medium text-foreground">{elegido?.nombre ?? "el gasto"}</span>
      </Card>
    );
  }

  // Paso 1 (ambiguo): elegir cuál marcar de una lista de candidatos.
  if (hayLista) {
    return (
      <Card>
        <CardLabel>¿Cuál marco como pagado?</CardLabel>
        <p className="mt-2 text-sm text-muted-foreground">Encontré varios pendientes que encajan. Elige uno:</p>
        <div className="mt-3 flex flex-col gap-2">
          {candidatos!.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSeleccion(c)}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-accent/50 max-md:py-2.5"
            >
              <span className="font-medium">{c.nombre}</span>
              <Badge tone="brand">{c.importe.toFixed(2)} €</Badge>
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
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

  // Paso 2 (o caso de movimiento único): confirmar el marcado del item elegido.
  if (!elegido) return null;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>Marcar como pagado</CardLabel>
        <Badge tone="brand">{elegido.importe.toFixed(2)} €</Badge>
      </div>
      <p className="mt-2 text-sm">
        ¿Marco como pagado <span className="font-semibold">{elegido.nombre}</span>?
      </p>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => confirmar(elegido)}>
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
