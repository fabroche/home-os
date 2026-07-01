"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  crearGastoRecurrente as crearGastoRecurrenteSrv,
  archivarRecurrente as archivarRecurrenteSrv,
} from "@/lib/services/gastos-recurrentes";
import { CrearGastoRecurrenteInputSchema } from "@/types/recurrentes";

/** Server Actions de gastos recurrentes (nativo Supabase). Validación Zod + auth + revalidate. */

export type WriteResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireUser() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  return user;
}

function zodErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "_");
    fieldErrors[key] ??= i.message;
  }
  return fieldErrors;
}

/** Crea un gasto recurrente (genera de inmediato el mes en curso si toca). */
export async function crearGastoRecurrente(input: unknown): Promise<WriteResult> {
  const parsed = CrearGastoRecurrenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    const user = await requireUser();
    const id = await crearGastoRecurrenteSrv(parsed.data, user.id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear el gasto recurrente." };
  }
}

/** Desactiva un recurrente (deja de generar; los movimientos ya creados se quedan). */
export async function archivarRecurrente(id: string): Promise<WriteResult> {
  if (!id) return { ok: false, error: "Falta el recurrente." };
  try {
    await requireUser();
    await archivarRecurrenteSrv(id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al archivar el recurrente." };
  }
}
