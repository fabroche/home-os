import "@/lib/server-guard";
import { queryDatabase } from "@/lib/notion/databases";
import { PRESUPUESTO, DEUDAS } from "@/lib/notion/schema";
import { toMovimiento } from "@/lib/notion/mappers/presupuesto";
import { toDeuda } from "@/lib/notion/mappers/deuda";
import type { Movimiento, Deuda } from "@/types/finanzas";

// Agregaciones puras (testeables sin server-only); se re-exportan por comodidad.
export { resumen, type ResumenFinanzas } from "@/lib/finanzas/aggregations";

/**
 * Servicio de dominio de finanzas.
 * INTERIM: lee directo de Notion. En M1 final leerá del espejo en Supabase
 * (el worker sincroniza); la firma de estas funciones no cambiará.
 */
export async function listMovimientos(): Promise<Movimiento[]> {
  const pages = await queryDatabase(PRESUPUESTO.id);
  return pages.map(toMovimiento);
}

export async function listDeudas(): Promise<Deuda[]> {
  const pages = await queryDatabase(DEUDAS.id);
  return pages.map(toDeuda);
}

