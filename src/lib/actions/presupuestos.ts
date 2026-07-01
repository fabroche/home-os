"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  guardarPresupuesto as guardarPresupuestoSrv,
  borrarPresupuesto as borrarPresupuestoSrv,
} from "@/lib/services/presupuestos";
import { CrearPresupuestoInputSchema } from "@/types/presupuestos";

/** Server Actions de presupuestos (nativo Supabase). Validación Zod + auth + revalidate. */

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

/** Fija/actualiza el tope de una categoría. */
export async function guardarPresupuesto(input: unknown): Promise<WriteResult> {
  const parsed = CrearPresupuestoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    const user = await requireUser();
    const id = await guardarPresupuestoSrv(parsed.data, user.id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar el presupuesto." };
  }
}

export async function borrarPresupuesto(id: string): Promise<WriteResult> {
  if (!id) return { ok: false, error: "Falta el presupuesto." };
  try {
    await requireUser();
    await borrarPresupuestoSrv(id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al borrar el presupuesto." };
  }
}
