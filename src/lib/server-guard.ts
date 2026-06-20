/**
 * Guard de "solo servidor/worker".
 *
 * Sustituye al paquete `server-only` en los módulos COMPARTIDOS por la app de Next
 * y el worker (Node). `server-only` lanza error al importarse fuera del runtime
 * react-server, lo que rompería el worker. Este guard solo impide el uso en el
 * NAVEGADOR (cliente), permitiendo tanto Next-server como el worker.
 *
 * (En módulos exclusivos de Next que usan APIs de Next —p. ej. next/headers— se
 *  puede seguir usando `server-only` directamente; ver src/lib/supabase/server.ts.)
 */
if (typeof window !== "undefined") {
  throw new Error(
    "Módulo solo de servidor/worker: no debe importarse desde un componente de cliente.",
  );
}
