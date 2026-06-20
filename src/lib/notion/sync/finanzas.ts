import "@/lib/server-guard";
import { queryDatabase } from "@/lib/notion/databases";
import { PRESUPUESTO, DEUDAS } from "@/lib/notion/schema";
import { toMovimiento } from "@/lib/notion/mappers/presupuesto";
import { toDeuda } from "@/lib/notion/mappers/deuda";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Sync Notion → Supabase (modelo híbrido). Lee las DBs de Notion (paginado +
 * rate-limited), mapea a dominio y hace UPSERT por `notion_page_id`.
 *
 * Por ahora es un sync COMPLETO (idempotente) en cada ejecución; el incremental
 * por `sync_state.last_edited` y el borrado de páginas eliminadas en Notion son
 * mejoras futuras (TODO). Lo invoca el worker (cron) y el script `sync:finanzas`.
 */
export async function syncFinanzas() {
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();

  // --- Presupuesto → movimiento ---
  const movs = (await queryDatabase(PRESUPUESTO.id)).map(toMovimiento);
  const movRows = movs.map((m) => ({
    notion_page_id: m.notionPageId,
    nombre: m.nombre,
    fecha: m.fecha,
    importe: m.importe,
    categoria: m.categoria,
    tipo: m.tipo,
    estado: m.estado,
    flujo: m.flujo,
    facturas: m.facturas,
    url: m.url ?? null,
    ultima_edicion: m.ultimaEdicion,
    synced_at: now,
  }));
  if (movRows.length > 0) {
    const { error } = await sb.from("movimiento").upsert(movRows, { onConflict: "notion_page_id" });
    if (error) throw new Error(`upsert movimiento: ${error.message}`);
  }

  // --- Deudas_Personales → deuda ---
  const deudas = (await queryDatabase(DEUDAS.id)).map(toDeuda);
  const deudaRows = deudas.map((d) => ({
    notion_page_id: d.notionPageId,
    concepto: d.concepto,
    fecha_creacion: d.fechaCreacion,
    valor: d.valor,
    persona: d.persona,
    url: d.url ?? null,
    ultima_edicion: d.ultimaEdicion,
    synced_at: now,
  }));
  if (deudaRows.length > 0) {
    const { error } = await sb.from("deuda").upsert(deudaRows, { onConflict: "notion_page_id" });
    if (error) throw new Error(`upsert deuda: ${error.message}`);
  }

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

  return { movimientos: movRows.length, deudas: deudaRows.length };
}
