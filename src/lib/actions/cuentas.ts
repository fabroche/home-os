"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  crearCuenta as crearCuentaSrv,
  archivarCuenta as archivarCuentaSrv,
  crearTarjeta as crearTarjetaSrv,
  archivarTarjeta as archivarTarjetaSrv,
} from "@/lib/services/cuentas";
import { CrearCuentaInputSchema, CrearTarjetaInputSchema } from "@/types/cuentas";

/**
 * Server Actions de cuentas y tarjetas (nativo Supabase). Validación Zod + auth + revalidate.
 * Resultado discriminado para no lanzar a través de la frontera servidor↔cliente.
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

export async function crearCuenta(input: unknown): Promise<WriteResult> {
  const parsed = CrearCuentaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    const user = await requireUser();
    const id = await crearCuentaSrv(parsed.data, user.id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear la cuenta." };
  }
}

export async function archivarCuenta(id: string): Promise<WriteResult> {
  if (!id) return { ok: false, error: "Falta la cuenta." };
  try {
    await requireUser();
    await archivarCuentaSrv(id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al archivar la cuenta." };
  }
}

export async function crearTarjeta(input: unknown): Promise<WriteResult> {
  const parsed = CrearTarjetaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    const user = await requireUser();
    const id = await crearTarjetaSrv(parsed.data, user.id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear la tarjeta." };
  }
}

export async function archivarTarjeta(id: string): Promise<WriteResult> {
  if (!id) return { ok: false, error: "Falta la tarjeta." };
  try {
    await requireUser();
    await archivarTarjetaSrv(id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al archivar la tarjeta." };
  }
}
