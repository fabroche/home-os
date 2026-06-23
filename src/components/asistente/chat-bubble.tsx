"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { preguntarAsistente, proponerContexto, registrarGasto, consultarJob } from "@/lib/actions/ai";
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
export function detectarIntencion(texto: string): "preguntar" | "ensenar" | "gasto" {
  const t = texto.toLowerCase();
  // Gasto PRIMERO: "regístrame un gasto…" comparte verbo con "enseñar", así que se
  // prioriza. Requiere un verbo imperativo + "gasto", o un gasto ya hecho (gasté/pagué/
  // compré). "¿en qué gasto más?" NO matchea (es pregunta, no acción).
  if (
    /(reg[ií]stra(r|me|á)?|an[oó]ta(r|me)?|ap[uú]nta(r|me)?|a[ñn]ade|mete|crea(r|me)?).{0,25}\bgasto\b/.test(t) ||
    /\b(gast[eé]|pagu[eé]|compr[eé])\b/.test(t)
  ) {
    return "gasto";
  }
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
  maxIntentos = 200,
}: {
  defaultOpen?: boolean;
  pollMs?: number;
  maxIntentos?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const primeraPersistencia = useRef(true);
  // Timers de polling en curso, indexados por jobId (uno por consulta). Al terminar
  // (ok/error/tope) se borra la entrada, lo que permite reanudar al reabrir/recargar.
  const activos = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // El input se bloquea mientras haya alguna consulta pendiente (derivado, no estado).
  const pending = messages.some((m) => m.pendiente);

  useEffect(() => {
    const map = activos.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  // Hidrata el historial desde sessionStorage (sobrevive a navegación/cierre/recarga
  // dentro de la pestaña). Un pendiente CON jobId se reanuda (el worker pudo terminar
  // mientras tanto); uno SIN jobId (nunca se llegó a encolar) se marca interrumpido.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const guardado = JSON.parse(raw) as ChatMsg[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación en montaje
        setMessages(
          guardado.map((m) =>
            m.pendiente && !m.jobId
              ? { ...m, pendiente: false, contenido: m.contenido || "(consulta interrumpida)" }
              : m,
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

  const actualizar = useCallback((id: string, patch: Partial<ChatMsg>) => {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // Sondea un job hasta que cierre (ok/error) o se agote la ventana. Idempotente por
  // jobId vía `activos`: si el tope se alcanza sin respuesta, deja el mensaje pendiente
  // para reanudarlo al reabrir (el resultado ya calculado sigue guardado en `ai_jobs`).
  const pollJob = useCallback(
    (aMsgId: string, jobId: string) => {
      let intentos = 0;
      const tick = async () => {
        intentos++;
        const st = await consultarJob(jobId);
        if (st.estado === "ok") {
          if (st.tipo === "proponer_contexto") {
            actualizar(aMsgId, {
              contenido: st.borradores.length
                ? "Te propongo guardar esto:"
                : "No encontré nada nuevo para registrar.",
              pendiente: false,
              jobId: undefined,
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
          } else if (st.tipo === "registrar_gasto") {
            const prop = st.propuesta;
            actualizar(aMsgId, {
              contenido: prop
                ? "Te propongo registrar este gasto:"
                : st.nota || "No pude sacar el gasto. ¿Me dices el importe?",
              pendiente: false,
              jobId: undefined,
            });
            if (prop) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", propuestaGasto: prop },
              ]);
            }
          } else {
            actualizar(aMsgId, {
              contenido: st.respuesta,
              fuentes: st.fuentes,
              pendiente: false,
              jobId: undefined,
            });
          }
          activos.current.delete(jobId);
          return;
        }
        if (st.estado === "error") {
          actualizar(aMsgId, {
            contenido: `No pude responder: ${st.error}`,
            pendiente: false,
            jobId: undefined,
          });
          activos.current.delete(jobId);
          return;
        }
        if (intentos >= maxIntentos) {
          // No se descarta: queda pendiente con su jobId y se reanudará al reabrir.
          activos.current.delete(jobId);
          return;
        }
        const t = setTimeout(tick, pollMs); // pendiente/ejecutando/desconocido → seguir
        activos.current.set(jobId, t);
      };
      const t = setTimeout(tick, pollMs);
      activos.current.set(jobId, t);
    },
    [actualizar, maxIntentos, pollMs],
  );

  // Arranca/reanuda el polling de cualquier mensaje pendiente que tenga jobId y no esté
  // ya sondeándose. Cubre el flujo normal (onSend asigna el jobId) y la reanudación al
  // reabrir el panel (`open`) o tras rehidratar el historial.
  useEffect(() => {
    for (const m of messages) {
      if (m.pendiente && m.jobId && !activos.current.has(m.jobId)) {
        pollJob(m.id, m.jobId);
      }
    }
  }, [messages, open, pollJob]);

  async function onSend(texto: string) {
    const intencion = detectarIntencion(texto);
    const userMsgId = crypto.randomUUID();
    const aMsgId = crypto.randomUUID();
    setMessages((ms) => [
      ...ms,
      { id: userMsgId, rol: "user", contenido: texto },
      { id: aMsgId, rol: "assistant", contenido: "", pendiente: true },
    ]);

    const res =
      intencion === "gasto"
        ? await registrarGasto({ peticion: texto })
        : intencion === "ensenar"
          ? await proponerContexto({ peticion: texto })
          : await preguntarAsistente({ pregunta: texto });
    if (!res.ok) {
      actualizar(aMsgId, { contenido: res.error, pendiente: false });
      return;
    }
    // Guarda el jobId en el mensaje: el efecto de arriba arranca el polling y, si la
    // pestaña se recarga, lo reanuda en vez de perder la respuesta del worker.
    actualizar(aMsgId, { jobId: res.jobId });
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
