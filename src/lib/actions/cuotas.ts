"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { crearPlanCuotas as crearPlanSrv, cancelarPlan as cancelarPlanSrv } from "@/lib/services/cuotas";
import { CrearPlanCuotasInputSchema } from "@/types/cuotas";

/**
 * Server Actions de gastos a plazos. Crear un plan genera de inmediato la cuota 1; el
 * resto las crea el worker cada mes. Validación Zod + auth + revalidate.
 */

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

export async function crearPlanCuotas(input: unknown): Promise<WriteResult> {
  const parsed = CrearPlanCuotasInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    const user = await requireUser();
    const id = await crearPlanSrv(parsed.data, user.id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear el plan." };
  }
}

export async function cancelarPlan(id: string): Promise<WriteResult> {
  if (!id) return { ok: false, error: "Falta el plan." };
  try {
    await requireUser();
    await cancelarPlanSrv(id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cancelar el plan." };
  }
}
