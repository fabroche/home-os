"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AccionAsistente } from "@/types/ai";

export type AclararData = {
  pregunta: string;
  opciones: { etiqueta: string; accion: AccionAsistente }[];
  /** Mensaje original del usuario, que se reenvía forzando la acción elegida. */
  mensaje: string;
};

/**
 * Tarjeta de desambiguación del Asistente (M6 · router). Cuando el modelo ve que el
 * mensaje puede interpretarse de más de una forma, no adivina: pregunta. Al elegir una
 * opción se reenvía el mensaje original FORZANDO esa acción (vía `onElegir`), reutilizando
 * el flujo dedicado de cada acción. Confirmar la propuesta resultante sigue siendo del usuario.
 */
export function AclararCard({
  aclarar,
  onElegir,
}: {
  aclarar: AclararData;
  onElegir?: (mensaje: string, accion: AccionAsistente) => void;
}) {
  const [elegido, setElegido] = useState<string | null>(null);

  if (elegido) {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <HelpCircle className="size-4 text-primary" />
        Has elegido: <span className="font-medium text-foreground">{elegido}</span>
      </Card>
    );
  }

  return (
    <Card>
      <CardLabel>¿A qué te refieres?</CardLabel>
      <p className="mt-2 text-sm">{aclarar.pregunta}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {aclarar.opciones.map((o) => (
          <Button
            key={o.etiqueta}
            size="sm"
            variant="ghost"
            onClick={() => {
              setElegido(o.etiqueta);
              onElegir?.(aclarar.mensaje, o.accion);
            }}
          >
            {o.etiqueta}
          </Button>
        ))}
      </div>
    </Card>
  );
}
