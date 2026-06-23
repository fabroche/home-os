"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BorradorContexto } from "@/types/ai";

export type Fuente = { id: string; titulo: string };
export type ChatMsg = {
  id: string;
  rol: "user" | "assistant";
  contenido: string;
  fuentes?: Fuente[];
  pendiente?: boolean;
  /** Job en curso asociado a un mensaje pendiente: permite reanudar el polling tras recargar/reabrir. */
  jobId?: string;
  /** Si está presente, el mensaje es una propuesta de contexto (se renderiza como tarjeta). */
  borrador?: BorradorContexto;
};

/** Una burbuja de mensaje del asistente (usuario a la derecha, IA a la izquierda). */
export function ChatMessage({ msg }: { msg: ChatMsg }) {
  const esUsuario = msg.rol === "user";
  return (
    <div className={cn("flex", esUsuario ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
          esUsuario
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        {msg.pendiente ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <span>pensando</span>
            <span className="inline-flex items-end gap-0.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1 rounded-full bg-current"
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
                />
              ))}
            </span>
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{msg.contenido}</p>
        )}

        {msg.fuentes && msg.fuentes.length > 0 && (
          <div className="mt-2 border-t border-border/50 pt-1.5 text-xs text-muted-foreground">
            <span className="font-medium">Fuentes: </span>
            {msg.fuentes.map((f, i) => (
              <span key={f.id}>
                {i > 0 && " · "}
                {f.titulo}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
