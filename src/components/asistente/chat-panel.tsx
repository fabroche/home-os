"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { X, Send, Sparkles } from "lucide-react";
import { ChatMessage, type ChatMsg } from "@/components/asistente/chat-message";
import { SuggestionCard } from "@/components/asistente/suggestion-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Panel del asistente (presentacional). En móvil ocupa casi toda la pantalla
 * (encima de la bottom nav); en desktop es una tarjeta anclada abajo a la derecha.
 * La lógica (encolar/polling) vive en el contenedor `ChatBubble`.
 */
export function ChatPanel({
  messages,
  pending,
  onSend,
  onClose,
}: {
  messages: ChatMsg[];
  pending: boolean;
  onSend: (texto: string) => void;
  onClose: () => void;
}) {
  const [texto, setTexto] = useState("");

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || pending) return;
    onSend(t);
    setTexto("");
  }

  return (
    <motion.section
      aria-label="Asistente"
      // Crece desde la esquina del FAB (abajo-derecha) al abrir y se recoge hacia él al
      // cerrar. `transformOrigin` ancla la escala al botón → efecto "expandir/recoger".
      initial={{ opacity: 0, scale: 0.4, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.4, y: 8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: "bottom right" }}
      className={cn(
        "flex flex-col overflow-hidden border border-border bg-card shadow-soft",
        // Móvil: sheet casi completo, encima de la bottom nav (h-16).
        "fixed inset-x-3 bottom-20 top-16 rounded-2xl",
        // Desktop: tarjeta anclada abajo a la derecha.
        "md:inset-auto md:bottom-24 md:right-6 md:top-auto md:h-[32rem] md:w-96",
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="inline-flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-primary" />
          Asistente
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Preguntá sobre tus finanzas o pedime guardar una regla en tu banco de contexto.
          </p>
        ) : (
          messages.map((m) =>
            m.borrador ? (
              <SuggestionCard key={m.id} borrador={m.borrador} />
            ) : (
              <ChatMessage key={m.id} msg={m} />
            ),
          )
        )}
      </div>

      <form onSubmit={enviar} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe tu pregunta…"
          aria-label="Mensaje para el asistente"
          className="h-10"
        />
        <button
          type="submit"
          disabled={pending || texto.trim().length === 0}
          aria-label="Enviar"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </motion.section>
  );
}
