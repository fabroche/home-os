import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  MovimientoSchema,
  DeudaSchema,
  flujoDeTipo,
  firmarImporte,
  firmarValorDeuda,
  type Movimiento,
  type Deuda,
  type CrearMovimientoInput,
  type CrearDeudaInput,
} from "@/types/finanzas";

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
  notion_page_id: string | null;
  nombre: string | null;
  fecha: string | null;
  importe: number | string | null;
  categoria: string | null;
  tipo: string | null;
  estado: string | null;
  flujo: string;
  cuenta_id: string | null;
  tarjeta_id: string | null;
  persona: string | null;
  facturas: string[] | null;
  comprobantes: string[] | null;
  url: string | null;
  ultima_edicion: string;
};

type DeudaRow = {
  id: string;
  origen: string | null;
  notion_page_id: string | null;
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
    cuentaId: r.cuenta_id,
    tarjetaId: r.tarjeta_id,
    persona: r.persona,
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

// === Escritura NATIVA (Fase B): la app escribe directo en Supabase (origen='app'). ===
// Editar/borrar una fila que vino de Notion la "adopta" (origen='app') para que el
// importador deje de gobernarla y el cambio sea permanente.

/** Crea un movimiento nativo (gasto/ingreso) con el importe ya firmado. Devuelve su `id`. */
export async function crearMovimientoNativo(d: CrearMovimientoInput, userId: string): Promise<string> {
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const flujo = flujoDeTipo(d.tipo);
  const { data, error } = await sb
    .from("movimiento")
    .insert({
      user_id: userId,
      origen: "app",
      nombre: d.nombre,
      fecha: d.fecha,
      importe: firmarImporte(d.importe, flujo),
      categoria: d.categoria,
      tipo: d.tipo,
      estado: d.estado,
      flujo,
      cuenta_id: d.cuentaId ?? null,
      tarjeta_id: d.tarjetaId ?? null,
      persona: d.persona?.trim() || null,
      facturas: [],
      comprobantes: [],
      ultima_edicion: now,
      synced_at: now,
      deleted_at: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`crearMovimientoNativo: ${error.message}`);
  return data!.id as string;
}

/** Crea una deuda/pago nativo con el valor ya firmado (deuda negativa, pago positivo). */
export async function crearDeudaNativa(d: CrearDeudaInput, userId: string): Promise<string> {
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("deuda")
    .insert({
      user_id: userId,
      origen: "app",
      concepto: d.concepto,
      fecha_creacion: d.fecha,
      valor: firmarValorDeuda(d.valor, d.movimiento),
      persona: d.persona,
      ultima_edicion: now,
      synced_at: now,
      deleted_at: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`crearDeudaNativa: ${error.message}`);
  return data!.id as string;
}

/** Cambia el estado de un movimiento (Pending↔Done) por `id`; lo adopta (origen='app'). */
export async function actualizarEstadoMovimiento(id: string, estado: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("movimiento").update({ estado, origen: "app" }).eq("id", id);
  if (error) throw new Error(`actualizarEstadoMovimiento: ${error.message}`);
}

/** Soft-delete de un movimiento por `id`; lo adopta para que el importador no lo reviva. */
export async function borrarMovimientoById(id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("movimiento")
    .update({ deleted_at: new Date().toISOString(), origen: "app" })
    .eq("id", id);
  if (error) throw new Error(`borrarMovimientoById: ${error.message}`);
}

/** Soft-delete de una deuda por `id`; la adopta para que el importador no la reviva. */
export async function borrarDeudaById(id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("deuda")
    .update({ deleted_at: new Date().toISOString(), origen: "app" })
    .eq("id", id);
  if (error) throw new Error(`borrarDeudaById: ${error.message}`);
}

/** Añade una URL de factura/comprobante a un movimiento por `id`; lo adopta (origen='app'). */
export async function adjuntarArchivoMovimiento(
  id: string,
  tipo: "factura" | "comprobante",
  url: string,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const col = tipo === "factura" ? "facturas" : "comprobantes";
  const { data, error } = await sb.from("movimiento").select("facturas, comprobantes").eq("id", id).single();
  if (error) throw new Error(`adjuntarArchivoMovimiento(leer): ${error.message}`);
  const existentes = ((data as Record<string, string[] | null>)[col] ?? []) as string[];
  const { error: e2 } = await sb
    .from("movimiento")
    .update({ [col]: [...existentes, url], origen: "app" })
    .eq("id", id);
  if (e2) throw new Error(`adjuntarArchivoMovimiento(escribir): ${e2.message}`);
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
