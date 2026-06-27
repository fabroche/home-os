"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AccionAsistente } from "@/types/ai";
import type { AccionResuelta } from "@/components/asistente/chat-message";

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
  resueltoInicial,
  onElegir,
  onResuelto,
}: {
  aclarar: AclararData;
  /** Estado resuelto persistido (al rehidratar): si está, la card nace congelada. */
  resueltoInicial?: AccionResuelta;
  onElegir?: (mensaje: string, accion: AccionAsistente) => void;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  // Resuelto efectivo = lo elegido aquí (local) o lo persistido/superado que llega por prop.
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  // Etiqueta de la opción elegida en esta sesión (al rehidratar no se conserva → texto genérico).
  const [etiqueta, setEtiqueta] = useState<string | null>(null);

  if (resuelto) {
    const txt =
      resuelto === "superado"
        ? "Descartada (lo reescribiste)"
        : etiqueta
          ? `Has elegido: ${etiqueta}`
          : "Ya elegiste una opción";
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <HelpCircle className="size-4 text-primary" />
        <span className="font-medium text-foreground">{txt}</span>
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
              setEtiqueta(o.etiqueta);
              setResueltoLocal("elegido");
              onResuelto?.("elegido");
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
