"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { preguntarAsistente, proponerContexto, consultarJob } from "@/lib/actions/ai";
import { ChatPanel } from "@/components/asistente/chat-panel";
import type { ChatMsg } from "@/components/asistente/chat-message";

/**
 * Burbuja de chat del Asistente (M6 · F-M6-5/6). FAB flotante que abre el panel;
 * según la intención encola `consulta_rag` (preguntar) o `proponer_contexto`
 * (enseñar), y **sondea** el resultado. En móvil el FAB va encima de la bottom nav.
 * `pollMs`/`maxIntentos` inyectables para tests. (Respuesta por polling; Realtime luego.)
 */

/** Heurística MVP de intención (a reemplazar por clasificación del modelo). */
export function detectarIntencion(texto: string): "preguntar" | "ensenar" {
  const t = texto.toLowerCase();
  if (
    /\b(recu[eé]rdame|an[oó]tame|reg[ií]stra|registr[aá]|guarda(r)? (esto|esta|en (el )?contexto)|crea(r|á)? (una |la )?(regla|nota|preferencia|entrada))\b/.test(
      t,
    )
  ) {
    return "ensenar";
  }
  return "preguntar";
}

export function ChatBubble({
  defaultOpen = false,
  pollMs = 1500,
  maxIntentos = 40,
}: {
  defaultOpen?: boolean;
  pollMs?: number;
  maxIntentos?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function actualizar(id: string, patch: Partial<ChatMsg>) {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function onSend(texto: string) {
    const intencion = detectarIntencion(texto);
    const userMsgId = crypto.randomUUID();
    const aMsgId = crypto.randomUUID();
    setMessages((ms) => [
      ...ms,
      { id: userMsgId, rol: "user", contenido: texto },
      { id: aMsgId, rol: "assistant", contenido: "", pendiente: true },
    ]);
    setPending(true);

    const res =
      intencion === "ensenar"
        ? await proponerContexto({ peticion: texto })
        : await preguntarAsistente({ pregunta: texto });
    if (!res.ok) {
      actualizar(aMsgId, { contenido: res.error, pendiente: false });
      setPending(false);
      return;
    }

    let intentos = 0;
    const poll = async () => {
      intentos++;
      const st = await consultarJob(res.jobId);
      if (st.estado === "ok") {
        if (st.tipo === "proponer_contexto") {
          actualizar(aMsgId, {
            contenido: st.borradores.length
              ? "Te propongo guardar esto:"
              : "No encontré nada nuevo para registrar.",
            pendiente: false,
          });
          if (st.borradores.length) {
            setMessages((ms) => [
              ...ms,
              ...st.borradores.map((b) => ({
                id: crypto.randomUUID(),
                rol: "assistant" as const,
                contenido: "",
                borrador: b,
              })),
            ]);
          }
        } else {
          actualizar(aMsgId, { contenido: st.respuesta, fuentes: st.fuentes, pendiente: false });
        }
        setPending(false);
        return;
      }
      if (st.estado === "error") {
        actualizar(aMsgId, { contenido: `No pude responder: ${st.error}`, pendiente: false });
        setPending(false);
        return;
      }
      if (intentos >= maxIntentos) {
        actualizar(aMsgId, { contenido: "El asistente tardó demasiado. Probá de nuevo.", pendiente: false });
        setPending(false);
        return;
      }
      timer.current = setTimeout(poll, pollMs); // pendiente/ejecutando/desconocido → seguir
    };
    timer.current = setTimeout(poll, pollMs);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente"
        className="fixed bottom-20 right-4 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:scale-105 md:bottom-6 md:right-6"
      >
        <Sparkles className="size-6" />
      </button>
    );
  }

  return (
    <ChatPanel messages={messages} pending={pending} onSend={onSend} onClose={() => setOpen(false)} />
  );
}
