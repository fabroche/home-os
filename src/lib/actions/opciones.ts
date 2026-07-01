"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCuentas, listTarjetas } from "@/lib/services/cuentas";
import { listMovimientos, listDeudas } from "@/lib/services/finanzas";
import { PERSONAS_DEUDA } from "@/types/finanzas";
import type { OpcionesFinanzas } from "@/types/ai-tools";

/**
 * Opciones de finanzas (cuentas, tarjetas y personas conocidas) para que la tarjeta genérica
 * del asistente rellene los campos de tipo entidad/persona. Solo lectura, autenticada.
 */
export async function opcionesFinanzas(): Promise<OpcionesFinanzas> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { cuentas: [], tarjetas: [], personas: [] };

  const [cuentas, tarjetas, movs, deudas] = await Promise.all([
    listCuentas(),
    listTarjetas(),
    listMovimientos(),
    listDeudas(),
  ]);
  const personas = [
    ...new Set([
      ...PERSONAS_DEUDA,
      ...deudas.map((d) => d.persona),
      ...movs.map((m) => m.persona),
    ]),
  ]
    .filter((p): p is string => Boolean(p && p.trim()))
    .sort();

  return {
    cuentas: cuentas.map((c) => ({ id: c.id, nombre: c.nombre })),
    tarjetas: tarjetas.map((t) => ({ id: t.id, nombre: t.nombre })),
    personas,
  };
}
