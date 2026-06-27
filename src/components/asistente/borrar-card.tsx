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
 * Tarjeta de acción del Asistente (M6 · tool calling): la IA propone borrar un movimiento
 * o deuda. Dos modos: un único `objetivo` (va directo a confirmar) o varios `candidatos`
 * (cuando la petición es ambigua, ej. "un gasto de comida"): el usuario ELIGE cuál y luego
 * confirma. La escritura SOLO ocurre al confirmar (archiva en Notion + soft-delete); la IA
 * nunca borra por su cuenta.
 */
export function BorrarCard({
  objetivo,
  candidatos,
  resueltoInicial,
  onResuelto,
}: {
  objetivo?: ObjetivoBorrar;
  candidatos?: ObjetivoBorrar[];
  /** Estado resuelto persistido (al rehidratar): si está, la card nace congelada. */
  resueltoInicial?: AccionResuelta;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  // Resuelto efectivo = lo decidido aquí (local) o lo persistido/superado que llega por prop.
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  // En modo lista, el item elegido por el usuario (pasa al paso de confirmación).
  const [seleccion, setSeleccion] = useState<ObjetivoBorrar | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const elegido = seleccion ?? objetivo ?? null;
  const hayLista = !elegido && !!candidatos?.length;

  function confirmar(item: ObjetivoBorrar) {
    setError(null);
    startTransition(async () => {
      const accion = item.tipo === "movimiento" ? borrarMovimiento : borrarDeuda;
      const res = await accion(item.id);
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
        {etiqueta}: <span className="font-medium text-foreground">{elegido?.nombre ?? "el elemento"}</span>
      </Card>
    );
  }

  // Paso 1 (ambiguo): elegir cuál borrar de una lista de candidatos.
  if (hayLista) {
    return (
      <Card>
        <CardLabel>¿Cuál quieres borrar?</CardLabel>
        <p className="mt-2 text-sm text-muted-foreground">Encontré varios que encajan. Elige uno:</p>
        <div className="mt-3 flex flex-col gap-2">
          {candidatos!.map((c) => (
            <button
              key={`${c.tipo}:${c.id}`}
              type="button"
              onClick={() => setSeleccion(c)}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-accent/50 max-md:py-2.5"
            >
              <span className="font-medium">{c.nombre}</span>
              <Badge tone="brand">{c.tipo}</Badge>
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

  // Paso 2 (o caso de objetivo único): confirmar el borrado del item elegido.
  if (!elegido) return null;
  const cosa = elegido.tipo === "movimiento" ? "movimiento" : "deuda";
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>Borrar {cosa}</CardLabel>
        <Badge tone="brand">{cosa}</Badge>
      </div>
      <p className="mt-2 text-sm">
        ¿Borro <span className="font-semibold">{elegido.nombre}</span>? Se archiva en Notion (reversible).
      </p>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => confirmar(elegido)}>
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
