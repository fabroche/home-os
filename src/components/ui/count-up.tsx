"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { useReducedMotion } from "motion/react";

/**
 * Número animado con conteo ascendente al entrar en viewport.
 * Formatea como divisa si se pasa `currency` (locale es-ES por defecto).
 *
 * Hasta montar (y si hay reduced-motion) renderiza el valor estático ya formateado, así el
 * HTML de servidor y el de cliente coinciden; tras montar, anima el conteo desde 0.
 */
export function AnimatedNumber({
  value,
  currency,
  locale = "es-ES",
  decimals = 0,
  className,
}: {
  value: number;
  currency?: string;
  locale?: string;
  decimals?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- guard de montaje para evitar mismatch
  useEffect(() => setMounted(true), []);

  const format = (n: number) =>
    new Intl.NumberFormat(locale, {
      ...(currency ? { style: "currency", currency } : {}),
      minimumFractionDigits: currency ? 2 : decimals,
      maximumFractionDigits: currency ? 2 : decimals,
    }).format(n);

  if (!mounted || reduce) {
    return <span className={className}>{format(value)}</span>;
  }

  return (
    <CountUp
      end={value}
      duration={1.1}
      decimals={currency ? 2 : decimals}
      formattingFn={format}
      enableScrollSpy
      scrollSpyOnce
      className={className}
    />
  );
}
