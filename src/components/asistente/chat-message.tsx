import { cn } from "@/lib/utils";
import type { BorradorContexto } from "@/types/ai";

export type Fuente = { id: string; titulo: string };
export type ChatMsg = {
  id: string;
  rol: "user" | "assistant";
  contenido: string;
  fuentes?: Fuente[];
  pendiente?: boolean;
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
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="animate-pulse">✦ pensando…</span>
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
