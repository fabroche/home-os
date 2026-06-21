"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { MotionConfig } from "motion/react";

/**
 * Provider de tema (light/dark) sobre next-themes + configuración global de motion.
 * - `attribute="class"` añade `.dark` a <html>, que activa los tokens de globals.css.
 * - MotionConfig: en producción respeta el "Reduced Motion" del SO (`user`); en desarrollo
 *   lo ignora (`never`) para poder ver las animaciones y evitar el warning de motion.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion={process.env.NODE_ENV === "production" ? "user" : "never"}>
        {children}
      </MotionConfig>
    </NextThemesProvider>
  );
}
