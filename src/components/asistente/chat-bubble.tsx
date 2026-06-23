"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import {
  preguntarAsistente,
  proponerContexto,
  registrarGasto,
  registrarIngreso,
  registrarDeuda,
  marcarPagado,
  consultarJob,
} from "@/lib/actions/ai";
import { ChatPanel } from "@/components/asistente/chat-panel";
import type { ChatMsg } from "@/components/asistente/chat-message";

const STORAGE_KEY = "homeos.chat.v1";

/**
 * Burbuja de chat del Asistente (M6 · F-M6-5/6). FAB flotante que abre el panel;
 * según la intención encola `consulta_rag` (preguntar) o `proponer_contexto`
 * (enseñar), y **sondea** el resultado. En móvil el FAB va encima de la bottom nav.
 * `pollMs`/`maxIntentos` inyectables para tests. (Respuesta por polling; Realtime luego.)
 */

export type Intencion = "preguntar" | "ensenar" | "gasto" | "ingreso" | "deuda" | "pagado";

/**
 * Heurística MVP de intención (a reemplazar por clasificación del modelo). El orden
 * importa: las acciones se detectan antes que pregunta/enseñar, y se evita confundir
 * preguntas-insight ("¿en qué gasto más?", "¿a quién le debo más?") con acciones
 * (exigen imperativo o un importe).
 */
export function detectarIntencion(texto: string): Intencion {
  const t = texto.toLowerCase();

  // Marcar pagado: referencia a algo existente + "pagado" (no confundir con "pagué 40").
  if (/\bpagad[oa]s?\b/.test(t) && /(marca|m[aá]rca|marcar|ya )/.test(t)) return "pagado";

  // Deuda/pago a una persona: préstamo, alta explícita, o deber/deber-importe.
  if (
    /\b(prest[eé]|prest[oó]|pr[eé]stamo)(?![a-záéíóúñ])/.test(t) ||
    /(reg[ií]stra|ap[uú]nta|an[oó]ta).{0,30}\b(deuda|pago)\b/.test(t) ||
    /\bdeb[oe]\b.{0,25}\d/.test(t)
  ) {
    return "deuda";
  }

  // Ingreso: imperativo + ingreso/salario/nómina, o verbo de cobro con importe.
  if (
    /(reg[ií]stra(r|me)?|ap[uú]nta(r|me)?|an[oó]ta(r|me)?|a[ñn]ade|mete).{0,25}\b(ingreso|salario|n[oó]mina)\b/.test(t) ||
    // sin \b final: en JS \b no marca frontera tras vocal acentuada (cobré, recibí…)
    /\b(cobr[eé]|recib[ií]|me pagaron|me ingresaron|gan[eé])(?![a-záéíóúñ]).{0,25}\d/.test(t)
  ) {
    return "ingreso";
  }

  // Gasto: imperativo + "gasto", o gasto ya hecho. "¿en qué gasto más?" NO matchea.
  if (
    /(reg[ií]stra(r|me|á)?|an[oó]ta(r|me)?|ap[uú]nta(r|me)?|a[ñn]ade|mete|crea(r|me)?).{0,25}\bgasto\b/.test(t) ||
    /\b(gast[eé]|pagu[eé]|compr[eé])(?![a-záéíóúñ])/.test(t) // sin \b final por las vocales acentuadas
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
          } else if (st.tipo === "registrar_gasto" || st.tipo === "registrar_ingreso") {
            const prop = st.propuesta;
            const cosa = st.tipo === "registrar_ingreso" ? "ingreso" : "gasto";
            actualizar(aMsgId, {
              contenido: prop
                ? `Te propongo registrar este ${cosa}:`
                : st.nota || `No pude sacar el ${cosa}. ¿Me dices el importe?`,
              pendiente: false,
              jobId: undefined,
            });
            if (prop) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", propuestaGasto: prop },
              ]);
            }
          } else if (st.tipo === "registrar_deuda") {
            const prop = st.propuestaDeuda;
            actualizar(aMsgId, {
              contenido: prop
                ? "Te propongo registrar esto:"
                : st.nota || "No pude sacarlo. ¿Quién y cuánto?",
              pendiente: false,
              jobId: undefined,
            });
            if (prop) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", propuestaDeuda: prop },
              ]);
            }
          } else if (st.tipo === "marcar_pagado") {
            const mov = st.movimiento;
            actualizar(aMsgId, {
              contenido: mov
                ? "¿Confirmas marcarlo como pagado?"
                : st.nota || "No tengo claro cuál. ¿Me dices el nombre del gasto?",
              pendiente: false,
              jobId: undefined,
            });
            if (mov) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", movimientoPagar: mov },
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
        : intencion === "ingreso"
          ? await registrarIngreso({ peticion: texto })
          : intencion === "deuda"
            ? await registrarDeuda({ peticion: texto })
            : intencion === "pagado"
              ? await marcarPagado({ peticion: texto })
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
