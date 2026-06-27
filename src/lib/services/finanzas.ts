import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { MovimientoSchema, DeudaSchema, type Movimiento, type Deuda } from "@/types/finanzas";

// Agregaciones puras (testeables sin server-only); se re-exportan por comodidad.
export { resumen, type ResumenFinanzas } from "@/lib/finanzas/aggregations";

/**
 * Servicio de dominio de finanzas. Lee del **espejo en Supabase** (rápido, sin
 * rate limits). El worker mantiene Supabase sincronizado desde Notion
 * (ver lib/notion/sync/finanzas.ts).
 */

// Filas de Supabase → DTO de dominio (validado con Zod).
type MovimientoRow = {
  id: string;
  origen: string | null;
  notion_page_id: string;
  nombre: string | null;
  fecha: string | null;
  importe: number | string | null;
  categoria: string | null;
  tipo: string | null;
  estado: string | null;
  flujo: string;
  facturas: string[] | null;
  comprobantes: string[] | null;
  url: string | null;
  ultima_edicion: string;
};

type DeudaRow = {
  id: string;
  origen: string | null;
  notion_page_id: string;
  concepto: string | null;
  fecha_creacion: string | null;
  valor: number | string | null;
  persona: string | null;
  url: string | null;
  ultima_edicion: string;
};

function rowToMovimiento(r: MovimientoRow): Movimiento {
  return MovimientoSchema.parse({
    id: r.id,
    origen: r.origen ?? undefined,
    notionPageId: r.notion_page_id,
    nombre: r.nombre ?? "",
    fecha: r.fecha,
    importe: r.importe == null ? null : Number(r.importe),
    categoria: r.categoria,
    tipo: r.tipo,
    estado: r.estado,
    facturas: r.facturas ?? [],
    comprobantes: r.comprobantes ?? [],
    flujo: r.flujo,
    url: r.url ?? undefined,
    ultimaEdicion: r.ultima_edicion,
  });
}

function rowToDeuda(r: DeudaRow): Deuda {
  return DeudaSchema.parse({
    id: r.id,
    origen: r.origen ?? undefined,
    notionPageId: r.notion_page_id,
    concepto: r.concepto ?? "",
    fechaCreacion: r.fecha_creacion,
    valor: r.valor == null ? null : Number(r.valor),
    persona: r.persona,
    url: r.url ?? undefined,
    ultimaEdicion: r.ultima_edicion,
  });
}

export async function listMovimientos(): Promise<Movimiento[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("movimiento")
    .select("*")
    .is("deleted_at", null)
    .order("fecha", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`listMovimientos: ${error.message}`);
  return (data as MovimientoRow[]).map(rowToMovimiento);
}

export async function listDeudas(): Promise<Deuda[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("deuda").select("*").is("deleted_at", null);
  if (error) throw new Error(`listDeudas: ${error.message}`);
  return (data as DeudaRow[]).map(rowToDeuda);
}

/**
 * Soft-delete del espejo en Supabase (deleted_at = ahora). Refleja al instante un
 * borrado/archivado en Notion sin esperar al sync por cron; la UI ya solo lee activos.
 */
export async function softDeleteMovimiento(pageId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("movimiento")
    .update({ deleted_at: new Date().toISOString() })
    .eq("notion_page_id", pageId);
  if (error) throw new Error(`softDeleteMovimiento: ${error.message}`);
}

export async function softDeleteDeuda(pageId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("deuda")
    .update({ deleted_at: new Date().toISOString() })
    .eq("notion_page_id", pageId);
  if (error) throw new Error(`softDeleteDeuda: ${error.message}`);
}

/** Marca de la última sincronización Notion→Supabase (la más reciente entre fuentes). */
export async function ultimoSync(): Promise<string | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("sync_state")
    .select("last_run")
    .order("last_run", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`ultimoSync: ${error.message}`);
  return (data?.last_run as string | null) ?? null;
}
