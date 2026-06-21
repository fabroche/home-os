"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  syncFinanzas,
  syncMovimientoById,
  syncDeudaById,
} from "@/lib/notion/sync/finanzas";
import { PRESUPUESTO, DEUDAS } from "@/lib/notion/schema";
import { createPageInDb, updatePageProps, retrievePage } from "@/lib/notion/mutations";
import { toMovimiento } from "@/lib/notion/mappers/presupuesto";
import {
  writeTitle,
  writeNumber,
  writeSelect,
  writeStatus,
  writeDate,
  writeFiles,
} from "@/lib/notion/properties-write";
import { subirArchivoFinanzas } from "@/lib/supabase/storage";
import {
  CrearMovimientoInputSchema,
  CrearDeudaInputSchema,
  ESTADOS,
  firmarImporte,
  firmarValorDeuda,
  flujoDeTipo,
} from "@/types/finanzas";

/**
 * Server Actions de escritura de finanzas. Notion es la fuente de verdad (modelo
 * híbrido): se escribe en Notion y se re-sincroniza la página al espejo Supabase.
 * Resultado discriminado para mostrar errores sin lanzar a través de la frontera.
 */

export type SyncResult =
  | { ok: true; movimientos: number; deudas: number; at: string }
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

/** Sync manual completo Notion→Supabase (sin esperar al worker). */
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

/** Cambia el estado de un movimiento (Pending ↔ Done) escribiendo en Notion. */
export async function cambiarEstadoMovimiento(
  pageId: string,
  estado: (typeof ESTADOS)[number],
): Promise<WriteResult> {
  if (!ESTADOS.includes(estado)) return { ok: false, error: "Estado inválido." };
  try {
    await requireUser();
    await updatePageProps(pageId, {
      [PRESUPUESTO.props.estado]: writeStatus(estado),
    });
    await syncMovimientoById(pageId);
    revalidatePath("/finanzas");
    return { ok: true, id: pageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cambiar estado." };
  }
}

/** Crea un movimiento (gasto/ingreso) en Notion con el importe ya firmado. */
export async function crearMovimiento(input: unknown): Promise<WriteResult> {
  const parsed = CrearMovimientoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  const d = parsed.data;
  try {
    await requireUser();
    const importe = firmarImporte(d.importe, flujoDeTipo(d.tipo));
    const page = await createPageInDb(PRESUPUESTO.id, {
      [PRESUPUESTO.props.nombre]: writeTitle(d.nombre),
      [PRESUPUESTO.props.importe]: writeNumber(importe),
      [PRESUPUESTO.props.categoria]: writeSelect(d.categoria),
      [PRESUPUESTO.props.tipo]: writeSelect(d.tipo),
      [PRESUPUESTO.props.fecha]: writeDate(d.fecha),
      [PRESUPUESTO.props.estado]: writeStatus(d.estado),
    });
    await syncMovimientoById(page.id);
    revalidatePath("/finanzas");
    return { ok: true, id: page.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear el movimiento." };
  }
}

/** Crea un movimiento de deuda (deuda negativa / pago positivo) en Notion. */
export async function crearDeuda(input: unknown): Promise<WriteResult> {
  const parsed = CrearDeudaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };
  }
  const d = parsed.data;
  try {
    await requireUser();
    const valor = firmarValorDeuda(d.valor, d.movimiento);
    const page = await createPageInDb(DEUDAS.id, {
      [DEUDAS.props.concepto]: writeTitle(d.concepto),
      [DEUDAS.props.valor]: writeNumber(valor),
      [DEUDAS.props.persona]: writeSelect(d.persona),
      [DEUDAS.props.fecha]: writeDate(d.fecha),
    });
    await syncDeudaById(page.id);
    revalidatePath("/finanzas");
    return { ok: true, id: page.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear la deuda." };
  }
}

/**
 * Sube una factura/comprobante a Storage y la añade (merge) a la propiedad files
 * correspondiente del movimiento en Notion. Recibe FormData (pageId, tipo, file).
 */
export async function subirArchivoMovimiento(formData: FormData): Promise<WriteResult> {
  const pageId = String(formData.get("pageId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const file = formData.get("file");

  if (!pageId) return { ok: false, error: "Falta el movimiento." };
  if (tipo !== "factura" && tipo !== "comprobante") return { ok: false, error: "Tipo inválido." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecciona un archivo." };

  try {
    await requireUser();

    // URLs existentes (Notion reemplaza la propiedad files completa al actualizar).
    const actual = toMovimiento(await retrievePage(pageId));
    const existentes = tipo === "factura" ? actual.facturas : actual.comprobantes;

    const url = await subirArchivoFinanzas(pageId, tipo, file);
    const prop = tipo === "factura" ? PRESUPUESTO.props.facturas : PRESUPUESTO.props.comprobantes;

    await updatePageProps(pageId, {
      [prop]: writeFiles([...existentes, url].map((u) => ({ url: u }))),
    });
    await syncMovimientoById(pageId);
    revalidatePath("/finanzas");
    return { ok: true, id: pageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al subir el archivo." };
  }
}
