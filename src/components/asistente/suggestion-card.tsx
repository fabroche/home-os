"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { guardarEntrada } from "@/lib/actions/contexto";
import { TIPO_LABEL } from "@/types/contexto";
import type { BorradorContexto } from "@/types/ai";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccionResuelta } from "@/components/asistente/chat-message";

/**
 * Tarjeta de sugerencia de contexto (M6 · F-M6-6). La IA propone un borrador; el
 * usuario decide: **Revisar y publicar** / **Guardar como borrador** / **Descartar**.
 * Publicar es acción del usuario (gobernanza M4); descartar no persiste nada.
 */
export function SuggestionCard({
  borrador,
  resueltoInicial,
  onResuelto,
}: {
  borrador: BorradorContexto;
  /** Estado resuelto persistido (al rehidratar): si está, la card nace congelada. */
  resueltoInicial?: AccionResuelta;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  // Resuelto efectivo = lo decidido aquí (local) o lo persistido/superado que llega por prop.
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar(estado: "publicado" | "borrador") {
    setError(null);
    startTransition(async () => {
      const res = await guardarEntrada({
        tipo: borrador.tipo,
        titulo: borrador.titulo,
        contenido: borrador.contenido,
        tags: borrador.tags,
        estado,
      });
      if (res.ok) {
        setResueltoLocal(estado);
        onResuelto?.(estado);
      } else {
        setError(res.error);
      }
    });
  }

  if (resuelto) {
    const etiqueta =
      resuelto === "publicado"
        ? "Publicado"
        : resuelto === "borrador"
          ? "Guardado como borrador"
          : resuelto === "superado"
            ? "Descartado (lo reescribiste)"
            : "Descartado";
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-income" />
        {etiqueta}: <span className="font-medium text-foreground">{borrador.titulo}</span>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>Sugerencia de contexto</CardLabel>
        <Badge tone="brand">{TIPO_LABEL[borrador.tipo]}</Badge>
      </div>
      <h4 className="mt-2 font-semibold">{borrador.titulo}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{borrador.contenido}</p>
      {borrador.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {borrador.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-xs text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => guardar("publicado")}>
          Revisar y publicar
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => guardar("borrador")}>
          Guardar como borrador
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setResueltoLocal("descartado");
            onResuelto?.("descartado");
          }}
        >
          Descartar
        </Button>
      </div>
    </Card>
  );
}
