"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Memoria de revelados durante ESTA carga de página (se vacía al recargar de verdad).
 * Un `<Reveal id>` se anima una sola vez **por carga**: al navegar entre secciones el
 * App Router re-monta la página, pero si su id ya se reveló, el contenido aparece al
 * instante sin volver a animar. Sin `id` se mantiene el comportamiento clásico
 * (animar al entrar en viewport, una vez por montaje).
 */
const revelados = new Set<string>();

/** Para tests: reinicia la memoria de revelados entre casos. */
export function _resetRevelados() {
  revelados.clear();
}

/** Para tests: marca un id como ya revelado (simula que su animación ya corrió). */
export function _marcarRevelado(id: string) {
  revelados.add(id);
}

/**
 * Envoltura de revelado al entrar en viewport (fade + slide-up discreto).
 * El respeto a `prefers-reduced-motion` lo gobierna `<MotionConfig>` (en theme-provider),
 * de forma consistente entre servidor y cliente para no romper la hidratación.
 * `delay` en segundos para escalonar. `id` activa la memoria "una vez por carga".
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
  /** Clave estable para recordar que ya se reveló en esta carga (evita re-animar al navegar). */
  id?: string;
}) {
  const MotionTag = motion[as];
  // Decisión fijada en el montaje: si su id ya se reveló en esta carga, no animamos
  // (initial=false → aparece visible al instante, sin re-animar al navegar).
  const [animar] = useState(() => !(id && revelados.has(id)));

  return (
    <MotionTag
      className={cn(className)}
      initial={animar ? { opacity: 0, y: 14 } : false}
      whileInView={animar ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        if (id) revelados.add(id);
      }}
    >
      {children}
    </MotionTag>
  );
}
