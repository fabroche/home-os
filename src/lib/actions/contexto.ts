"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EntradaContextoInputSchema,
  ESTADOS_CONTEXTO,
  type EstadoContexto,
} from "@/types/contexto";

/**
 * Server Actions del banco de contexto (M4). Validación con Zod, `user_id` del
 * usuario autenticado (RLS). Devuelven un resultado discriminado para que la UI
 * muestre errores de validación sin lanzar a través de la frontera servidor↔cliente.
 */

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireUser() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  return { sb, userId: user.id };
}

async function syncTags(
  sb: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  entradaId: string,
  tags: string[],
) {
  // Estrategia simple (corpus pequeño, single-user): reemplazar el conjunto.
  const { error: delErr } = await sb
    .from("entrada_contexto_tag")
    .delete()
    .eq("entrada_id", entradaId);
  if (delErr) throw new Error(delErr.message);

  const unicos = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  if (unicos.length === 0) return;

  const { error: insErr } = await sb
    .from("entrada_contexto_tag")
    .insert(unicos.map((tag) => ({ entrada_id: entradaId, tag })));
  if (insErr) throw new Error(insErr.message);
}

/** Crea (sin `id`) o actualiza (con `id`) una entrada y sincroniza sus tags. */
export async function guardarEntrada(input: unknown): Promise<ActionResult> {
  const parsed = EntradaContextoInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Revisa los campos.", fieldErrors };
  }
  const data = parsed.data;

  try {
    const { sb, userId } = await requireUser();
    const fila = {
      user_id: userId,
      tipo: data.tipo,
      titulo: data.titulo,
      contenido: data.contenido,
      vigente_desde: data.vigenteDesde,
      vigente_hasta: data.vigenteHasta,
      estado: data.estado,
    };

    let id = data.id;
    if (id) {
      const { error } = await sb.from("entrada_contexto").update(fila).eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data: inserted, error } = await sb
        .from("entrada_contexto")
        .insert(fila)
        .select("id")
        .single();
      if (error || !inserted) return { ok: false, error: error?.message ?? "No se pudo crear." };
      id = inserted.id as string;
    }

    await syncTags(sb, id, data.tags);
    revalidatePath("/contexto");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

/** Cambia el estado (publicar / archivar / volver a borrador). */
export async function cambiarEstado(id: string, estado: EstadoContexto): Promise<ActionResult> {
  if (!ESTADOS_CONTEXTO.includes(estado)) return { ok: false, error: "Estado inválido." };
  try {
    const { sb } = await requireUser();
    const { error } = await sb.from("entrada_contexto").update({ estado }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/contexto");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

/** Elimina una entrada (sus tags caen por ON DELETE CASCADE). */
export async function eliminarEntrada(id: string): Promise<ActionResult> {
  try {
    const { sb } = await requireUser();
    const { error } = await sb.from("entrada_contexto").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/contexto");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}
