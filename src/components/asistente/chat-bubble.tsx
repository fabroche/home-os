"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import {
  enviarAlAsistente,
  preguntarAsistente,
  proponerContexto,
  registrarGasto,
  registrarIngreso,
  registrarDeuda,
  marcarPagado,
  consultarJob,
  type EncolarResult,
} from "@/lib/actions/ai";
import { ChatPanel } from "@/components/asistente/chat-panel";
import type { ChatMsg, AccionResuelta } from "@/components/asistente/chat-message";
import type { AccionAsistente, TurnoConversacion } from "@/types/ai";

const STORAGE_KEY = "homeos.chat.v1";

/** Un mensaje que lleva una tarjeta de acción todavía sin resolver (interactuable). */
function esCardSinResolver(m: ChatMsg): boolean {
  return (
    !m.accionResuelta &&
    Boolean(
      m.propuestaGasto ||
        m.propuestaDeuda ||
        m.movimientoPagar ||
        m.pagarCandidatos ||
        m.borrarObjetivo ||
        m.borrarCandidatos ||
        m.borrador ||
        m.aclarar,
    )
  );
}

/**
 * Convierte un mensaje del chat en un turno de conversación para el router. Las tarjetas
 * (cuyo `contenido` está vacío) se serializan a texto para que el modelo entienda qué
 * propuso antes y pueda enmendarla. Devuelve null para lo que no aporta contexto.
 */
function turnoDeMensaje(m: ChatMsg): TurnoConversacion | null {
  if (m.pendiente) return null;
  if (m.rol === "user") return m.contenido ? { rol: "user", texto: m.contenido } : null;
  if (m.propuestaGasto) {
    const p = m.propuestaGasto;
    const tipo = p.tipo.startsWith("Ingreso") ? "ingreso" : "gasto";
    return { rol: "assistant", texto: `Propuse registrar un ${tipo}: "${p.nombre}", ${p.importe}€, categoría ${p.categoria}, ${p.tipo}, fecha ${p.fecha}.` };
  }
  if (m.propuestaDeuda) {
    const p = m.propuestaDeuda;
    return { rol: "assistant", texto: `Propuse registrar ${p.movimiento === "pago" ? "un pago" : "una deuda"}: "${p.concepto}", persona ${p.persona}, ${p.valor}€, fecha ${p.fecha}.` };
  }
  if (m.movimientoPagar) {
    const p = m.movimientoPagar;
    return { rol: "assistant", texto: `Propuse marcar como pagado: "${p.nombre}" (${p.importe}€).` };
  }
  if (m.pagarCandidatos?.length) {
    return {
      rol: "assistant",
      texto: `Ofrecí elegir cuál marcar como pagado: ${m.pagarCandidatos.map((c) => `"${c.nombre}"`).join(", ")}.`,
    };
  }
  if (m.borrarObjetivo) {
    const o = m.borrarObjetivo;
    return { rol: "assistant", texto: `Propuse borrar ${o.tipo}: "${o.nombre}".` };
  }
  if (m.borrarCandidatos?.length) {
    return {
      rol: "assistant",
      texto: `Ofrecí elegir cuál borrar: ${m.borrarCandidatos.map((c) => `"${c.nombre}"`).join(", ")}.`,
    };
  }
  if (m.borrador) return { rol: "assistant", texto: `Propuse guardar en el banco de contexto: "${m.borrador.titulo}".` };
  if (m.aclarar) return { rol: "assistant", texto: `Pedí aclaración: ${m.aclarar.pregunta}` };
  return m.contenido ? { rol: "assistant", texto: m.contenido } : null;
}

/** Últimos turnos de la conversación (compacto) que se envían al router como contexto. */
function construirHistorial(messages: ChatMsg[]): TurnoConversacion[] {
  return messages
    .map(turnoDeMensaje)
    .filter((t): t is TurnoConversacion => t !== null)
    .slice(-8);
}

/**
 * Burbuja de chat del Asistente (M6 · F-M6-5/6). FAB flotante que abre el panel; encola
 * cada mensaje en el **router** (`asistente`), que clasifica la intención con el modelo
 * (responder/registrar/…/aclarar) y **sondea** el resultado. Cuando el router pide aclarar,
 * elegir una opción reenvía el mensaje FORZANDO esa acción (vía las acciones dedicadas).
 * En móvil el FAB va encima de la bottom nav. `pollMs`/`maxIntentos` inyectables para tests.
 */

/** Encola la acción concreta correspondiente a una opción de desambiguación. */
function encolarAccion(mensaje: string, accion: AccionAsistente): Promise<EncolarResult> {
  switch (accion) {
    case "gasto":
      return registrarGasto({ peticion: mensaje });
    case "ingreso":
      return registrarIngreso({ peticion: mensaje });
    case "deuda":
      return registrarDeuda({ peticion: mensaje });
    case "pagado":
      return marcarPagado({ peticion: mensaje });
    case "contexto":
      return proponerContexto({ peticion: mensaje });
    case "responder":
      return preguntarAsistente({ pregunta: mensaje });
  }
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

  // Persiste el estado final de una tarjeta (creado/pagado/cancelado/…) en su mensaje, para
  // que al reabrir/recargar NO vuelva a ser interactuable (se rehidrata congelada).
  const onCardResuelto = useCallback(
    (id: string, estado: AccionResuelta) => actualizar(id, { accionResuelta: estado }),
    [actualizar],
  );

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
            const cands = st.candidatos ?? [];
            actualizar(aMsgId, {
              contenido: mov
                ? "¿Confirmas marcarlo como pagado?"
                : cands.length
                  ? "Encontré varios. ¿Cuál marco como pagado?"
                  : st.nota || "No tengo claro cuál. ¿Me dices el nombre del gasto?",
              pendiente: false,
              jobId: undefined,
            });
            if (mov) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", movimientoPagar: mov },
              ]);
            } else if (cands.length) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", pagarCandidatos: cands },
              ]);
            }
          } else if (st.tipo === "borrar") {
            const obj = st.objetivo;
            const cands = st.candidatos ?? [];
            actualizar(aMsgId, {
              contenido: obj
                ? "¿Confirmas el borrado?"
                : cands.length
                  ? "Encontré varios. ¿Cuál quieres borrar?"
                  : st.nota || "No tengo claro qué borrar. ¿Me dices cuál?",
              pendiente: false,
              jobId: undefined,
            });
            if (obj) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", borrarObjetivo: obj },
              ]);
            } else if (cands.length) {
              setMessages((ms) => [
                ...ms,
                { id: crypto.randomUUID(), rol: "assistant" as const, contenido: "", borrarCandidatos: cands },
              ]);
            }
          } else if (st.tipo === "aclarar") {
            const { pregunta, opciones } = st;
            // El mensaje original quedó guardado en el bubble pendiente (`mensajeOrigen`); lo
            // recuperamos para que la tarjeta pueda reenviarlo forzando la acción elegida.
            setMessages((ms) => {
              const origen = ms.find((m) => m.id === aMsgId)?.mensajeOrigen ?? "";
              return [
                ...ms.map((m) =>
                  m.id === aMsgId ? { ...m, contenido: pregunta, pendiente: false, jobId: undefined } : m,
                ),
                {
                  id: crypto.randomUUID(),
                  rol: "assistant" as const,
                  contenido: "",
                  aclarar: { pregunta, opciones, mensaje: origen },
                },
              ];
            });
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

  // Crea el bubble del asistente pendiente, encola el job y le asigna su jobId (el efecto
  // de arriba arranca/reanuda el polling). `userMsg` añade el mensaje del usuario; en la
  // ruta del router se guarda `mensajeOrigen` para que "aclarar" pueda reenviarlo.
  const lanzarJob = useCallback(
    async (
      encolar: () => Promise<EncolarResult>,
      opts: { userMsg?: string; mensajeOrigen?: string } = {},
    ) => {
      const aMsgId = crypto.randomUUID();
      setMessages((ms) => [
        ...ms,
        ...(opts.userMsg ? [{ id: crypto.randomUUID(), rol: "user" as const, contenido: opts.userMsg }] : []),
        { id: aMsgId, rol: "assistant" as const, contenido: "", pendiente: true, mensajeOrigen: opts.mensajeOrigen },
      ]);
      const res = await encolar();
      if (!res.ok) {
        actualizar(aMsgId, { contenido: res.error, pendiente: false });
        return;
      }
      actualizar(aMsgId, { jobId: res.jobId });
    },
    [actualizar],
  );

  // Todo mensaje va al router: el modelo clasifica la intención (o pide aclarar). Antes de
  // lanzar, **supera** cualquier tarjeta pendiente sin resolver: si el usuario vuelve a
  // escribir (p. ej. "no, fue hace 2 días") esa propuesta queda congelada y no se puede
  // confirmar por error (evita duplicados y cards "zombi" al reabrir).
  const onSend = useCallback(
    (texto: string) => {
      // Historial ANTES de añadir este mensaje: da al router el contexto para enmendar
      // una propuesta anterior (ej. "no, fue hace 2 días"). Se omite si no hay nada.
      const historial = construirHistorial(messages);
      setMessages((ms) =>
        ms.map((m) => (esCardSinResolver(m) ? { ...m, accionResuelta: "superado" as const } : m)),
      );
      void lanzarJob(
        () => enviarAlAsistente({ mensaje: texto, ...(historial.length ? { historial } : {}) }),
        { userMsg: texto, mensajeOrigen: texto },
      );
    },
    [lanzarJob, messages],
  );

  // Elegir una opción de desambiguación: reenvía el mensaje original FORZANDO la acción.
  const onElegirAccion = useCallback(
    (mensaje: string, accion: AccionAsistente) => {
      void lanzarJob(() => encolarAccion(mensaje, accion));
    },
    [lanzarJob],
  );

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
            onElegirAccion={onElegirAccion}
            onResuelto={onCardResuelto}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
