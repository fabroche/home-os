"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncFinanzas } from "@/lib/notion/sync/finanzas";

/**
 * Sync manual Notion→Supabase disparado desde la UI (sin esperar al worker).
 * Reutiliza `syncFinanzas()` (el mismo núcleo que ejecuta el cron del worker).
 */
export type SyncResult =
  | { ok: true; movimientos: number; deudas: number; at: string }
  | { ok: false; error: string };

export async function syncFinanzasAction(): Promise<SyncResult> {
  try {
    // Defensa en profundidad: la ruta ya está tras el middleware de auth.
    const sb = await createSupabaseServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado." };

    const res = await syncFinanzas();
    revalidatePath("/finanzas");
    return { ok: true, ...res, at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error en el sync." };
  }
}
