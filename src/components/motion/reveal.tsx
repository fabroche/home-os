"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Envoltura de revelado al entrar en viewport (fade + slide-up discreto).
 * El respeto a `prefers-reduced-motion` lo gobierna `<MotionConfig>` (en theme-provider),
 * de forma consistente entre servidor y cliente para no romper la hidratación.
 * `delay` en segundos para escalonar.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={cn(className)}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
