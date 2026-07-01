"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncFinanzas } from "@/lib/notion/sync/finanzas";
import {
  crearMovimientoNativo,
  crearDeudaNativa,
  editarMovimiento as editarMovimientoSrv,
  editarDeuda as editarDeudaSrv,
  actualizarEstadoMovimiento,
  borrarMovimientoById,
  borrarDeudaById,
  adjuntarArchivoMovimiento,
  pagarExtracto as pagarExtractoSrv,
} from "@/lib/services/finanzas";
import { subirArchivoFinanzas } from "@/lib/supabase/storage";
import {
  CrearMovimientoInputSchema,
  CrearDeudaInputSchema,
  EditarMovimientoInputSchema,
  EditarDeudaInputSchema,
  ESTADOS,
} from "@/types/finanzas";

/**
 * Server Actions de escritura de finanzas (Fase B · Supabase-nativo). La app escribe
 * DIRECTO en Supabase (origen='app'); Notion ya solo importa. Editar/borrar una fila
 * que vino de Notion la "adopta" (origen='app') para que el importador no la pise.
 * Resultado discriminado para mostrar errores sin lanzar a través de la frontera.
 */

export type SyncResult =
  | {
      ok: true;
      movimientos: number;
      deudas: number;
      movimientosBorrados: number;
      deudasBorrados: number;
      at: string;
    }
  | { ok: false; error: string };

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

/** Sync (importación) manual desde Notion (sin esperar al worker). */
export async function syncFinanzasAction(): Promise<SyncResult> {
  try {
    await requireUser();
    const res = await syncFinanzas();
    revalidatePath("/finanzas");
    return { ok: true, ...res, at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error en el sync." };
  }
}

/** Cambia el estado de un movimiento (Pending ↔ Done) por su `id` nativo. */
export async function cambiarEstadoMovimiento(
  id: string,
  estado: (typeof ESTADOS)[number],
): Promise<WriteResult> {
  if (!ESTADOS.includes(estado)) return { ok: false, error: "Estado inválido." };
  try {
    await requireUser();
    await actualizarEstadoMovimiento(id, estado);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cambiar estado." };
  }
}

/** Crea un movimiento (gasto/ingreso) nativo en Supabase. */
export async function crearMovimiento(input: unknown): Promise<WriteResult> {
  const parsed = CrearMovimientoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    const user = await requireUser();
    const id = await crearMovimientoNativo(parsed.data, user.id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear el movimiento." };
  }
}

/** Crea un movimiento de deuda (deuda negativa / pago positivo) nativo en Supabase. */
export async function crearDeuda(input: unknown): Promise<WriteResult> {
  const parsed = CrearDeudaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    const user = await requireUser();
    const id = await crearDeudaNativa(parsed.data, user.id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear la deuda." };
  }
}

/** Edita un movimiento (gasto/ingreso) existente en Supabase. */
export async function editarMovimiento(input: unknown): Promise<WriteResult> {
  const parsed = EditarMovimientoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    await requireUser();
    await editarMovimientoSrv(parsed.data);
    revalidatePath("/finanzas");
    return { ok: true, id: parsed.data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al editar el movimiento." };
  }
}

/** Edita una deuda/pago existente en Supabase. */
export async function editarDeuda(input: unknown): Promise<WriteResult> {
  const parsed = EditarDeudaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  try {
    await requireUser();
    await editarDeudaSrv(parsed.data);
    revalidatePath("/finanzas");
    return { ok: true, id: parsed.data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al editar la deuda." };
  }
}

/** Borra un movimiento por `id` (soft-delete + adopción). La IA nunca borra: solo tras confirmar. */
export async function borrarMovimiento(id: string): Promise<WriteResult> {
  if (!id) return { ok: false, error: "Falta el movimiento." };
  try {
    await requireUser();
    await borrarMovimientoById(id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al borrar el movimiento." };
  }
}

/** Borra una deuda por `id` (soft-delete + adopción). Tras confirmación del usuario. */
export async function borrarDeuda(id: string): Promise<WriteResult> {
  if (!id) return { ok: false, error: "Falta la deuda." };
  try {
    await requireUser();
    await borrarDeudaById(id);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al borrar la deuda." };
  }
}

/**
 * Paga (liquida) el extracto de una tarjeta de crédito: marca sus cargos pendientes como
 * liquidados y estampa la cuenta que liquida (baja el banco). Tras confirmación del usuario.
 */
export async function pagarExtracto(tarjetaId: string): Promise<WriteResult> {
  if (!tarjetaId) return { ok: false, error: "Falta la tarjeta." };
  try {
    await requireUser();
    await pagarExtractoSrv(tarjetaId);
    revalidatePath("/finanzas");
    return { ok: true, id: tarjetaId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al pagar el extracto." };
  }
}

/**
 * Sube una factura/comprobante a Storage y la añade al movimiento (por `id`) en Supabase.
 * Recibe FormData (pageId = id del movimiento, tipo, file).
 */
export async function subirArchivoMovimiento(formData: FormData): Promise<WriteResult> {
  const id = String(formData.get("pageId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const file = formData.get("file");

  if (!id) return { ok: false, error: "Falta el movimiento." };
  if (tipo !== "factura" && tipo !== "comprobante") return { ok: false, error: "Tipo inválido." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecciona un archivo." };

  try {
    await requireUser();
    const url = await subirArchivoFinanzas(id, tipo, file);
    await adjuntarArchivoMovimiento(id, tipo, url);
    revalidatePath("/finanzas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al subir el archivo." };
  }
}
