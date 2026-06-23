"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { preguntarAsistente, proponerContexto, consultarJob } from "@/lib/actions/ai";
import { ChatPanel } from "@/components/asistente/chat-panel";
import type { ChatMsg } from "@/components/asistente/chat-message";

const STORAGE_KEY = "homeos.chat.v1";

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
  const primeraPersistencia = useRef(true);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // Hidrata el historial desde sessionStorage (sobrevive a navegación/cierre/recarga
  // dentro de la pestaña). Una consulta a medias (pendiente) se cierra al restaurar.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const guardado = JSON.parse(raw) as ChatMsg[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación en montaje
        setMessages(
          guardado.map((m) =>
            m.pendiente ? { ...m, pendiente: false, contenido: m.contenido || "(consulta interrumpida)" } : m,
          ),
        );
      }
    } catch {
      // sin historial / storage no disponible
    }
  }, []);

  // Persiste el historial. Salta la primera ejecución para no pisar lo hidratado.
  useEffect(() => {
    if (primeraPersistencia.current) {
      primeraPersistencia.current = false;
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage lleno / no disponible: el chat sigue funcionando en memoria
    }
  }, [messages]);

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

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir asistente"
            className="fixed bottom-20 right-4 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft md:bottom-6 md:right-6"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Sparkles className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <ChatPanel
            key="panel"
            messages={messages}
            pending={pending}
            onSend={onSend}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
