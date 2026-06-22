import "@/lib/server-guard";
import { queryDatabase } from "@/lib/notion/databases";
import { retrievePage } from "@/lib/notion/mutations";
import { PRESUPUESTO, DEUDAS } from "@/lib/notion/schema";
import { toMovimiento } from "@/lib/notion/mappers/presupuesto";
import { toDeuda } from "@/lib/notion/mappers/deuda";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Movimiento, Deuda } from "@/types/finanzas";

/**
 * Sync Notion → Supabase (modelo híbrido). Lee las DBs de Notion (paginado +
 * rate-limited), mapea a dominio y hace UPSERT por `notion_page_id`.
 *
 * Es un sync COMPLETO (idempotente) en cada ejecución con **mark-and-sweep** de
 * borrados: las páginas activas se upsertan con `synced_at = runTs` y `deleted_at
 * = null` (reviven si reaparecen); luego se marcan como borradas (`deleted_at`)
 * las filas que no se tocaron esta corrida (ya no existen en Notion). La UI lee
 * solo activos (deleted_at is null). El incremental por `sync_state.last_edited`
 * es mejora futura. Lo invoca el worker (cron) y el script `sync:finanzas`.
 */
const movimientoRow = (m: Movimiento, now: string) => ({
  notion_page_id: m.notionPageId,
  nombre: m.nombre,
  fecha: m.fecha,
  importe: m.importe,
  categoria: m.categoria,
  tipo: m.tipo,
  estado: m.estado,
  flujo: m.flujo,
  facturas: m.facturas,
  comprobantes: m.comprobantes,
  url: m.url ?? null,
  ultima_edicion: m.ultimaEdicion,
  synced_at: now,
  deleted_at: null,
});

const deudaRow = (d: Deuda, now: string) => ({
  notion_page_id: d.notionPageId,
  concepto: d.concepto,
  fecha_creacion: d.fechaCreacion,
  valor: d.valor,
  persona: d.persona,
  url: d.url ?? null,
  ultima_edicion: d.ultimaEdicion,
  synced_at: now,
  deleted_at: null,
});

/** Re-sincroniza una sola página de Presupuesto tras escribir en Notion. */
export async function syncMovimientoById(pageId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const m = toMovimiento(await retrievePage(pageId));
  const { error } = await sb
    .from("movimiento")
    .upsert([movimientoRow(m, new Date().toISOString())], { onConflict: "notion_page_id" });
  if (error) throw new Error(`syncMovimientoById: ${error.message}`);
}

/** Re-sincroniza una sola página de Deudas_Personales tras escribir en Notion. */
export async function syncDeudaById(pageId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const d = toDeuda(await retrievePage(pageId));
  const { error } = await sb
    .from("deuda")
    .upsert([deudaRow(d, new Date().toISOString())], { onConflict: "notion_page_id" });
  if (error) throw new Error(`syncDeudaById: ${error.message}`);
}

/**
 * Marca como borradas (soft-delete) las filas que no se tocaron en esta corrida,
 * es decir, las que ya no vienen de Notion. Solo se ejecuta si el query trajo al
 * menos una página: así un fallo de red (0 resultados) nunca vacía el espejo.
 * El barrido por `synced_at < runTs` evita un `IN (...)` con miles de ids.
 */
async function sweepBorrados(
  sb: ReturnType<typeof createSupabaseServiceClient>,
  tabla: "movimiento" | "deuda",
  runTs: string,
  vinieron: number,
): Promise<number> {
  if (vinieron === 0) return 0;
  const { data, error } = await sb
    .from(tabla)
    .update({ deleted_at: runTs })
    .lt("synced_at", runTs)
    .is("deleted_at", null)
    .select("notion_page_id");
  if (error) throw new Error(`sweep ${tabla}: ${error.message}`);
  return data?.length ?? 0;
}

export async function syncFinanzas() {
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();

  // --- Presupuesto → movimiento ---
  const movs = (await queryDatabase(PRESUPUESTO.id)).map(toMovimiento);
  const movRows = movs.map((m) => movimientoRow(m, now));
  if (movRows.length > 0) {
    const { error } = await sb.from("movimiento").upsert(movRows, { onConflict: "notion_page_id" });
    if (error) throw new Error(`upsert movimiento: ${error.message}`);
  }
  const movimientosBorrados = await sweepBorrados(sb, "movimiento", now, movRows.length);

  // --- Deudas_Personales → deuda ---
  const deudas = (await queryDatabase(DEUDAS.id)).map(toDeuda);
  const deudaRows = deudas.map((d) => deudaRow(d, now));
  if (deudaRows.length > 0) {
    const { error } = await sb.from("deuda").upsert(deudaRows, { onConflict: "notion_page_id" });
    if (error) throw new Error(`upsert deuda: ${error.message}`);
  }
  const deudasBorradas = await sweepBorrados(sb, "deuda", now, deudaRows.length);

  // --- sync_state (marca de la última corrida) ---
  const maxEdit = (arr: { ultimaEdicion: string }[]) =>
    arr.reduce((acc, x) => (x.ultimaEdicion > acc ? x.ultimaEdicion : acc), "");
  await sb.from("sync_state").upsert(
    [
      { fuente: "notion:presupuesto", last_run: now, last_edited: maxEdit(movs) || null },
      { fuente: "notion:deudas", last_run: now, last_edited: maxEdit(deudas) || null },
    ],
    { onConflict: "fuente" },
  );

  return {
    movimientos: movRows.length,
    deudas: deudaRows.length,
    movimientosBorrados,
    deudasBorrados: deudasBorradas,
  };
}
