import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { crearMovimientoNativo } from "@/lib/services/finanzas";
import { fechasCuotas, importesCuotas, cuotasDebidas } from "@/lib/finanzas/cuotas";
import { PlanCuotasSchema, type PlanCuotas, type CrearPlanCuotasInput } from "@/types/cuotas";
import type { CrearMovimientoInput } from "@/types/finanzas";

/**
 * Servicio de gastos a plazos (nativo Supabase). Crea el plan y genera las cuotas DEBIDAS
 * como movimientos (cargos en la tarjeta). El worker llama a `generarCuotasPendientes` a
 * diario: idempotente vía `cuotas_generadas` y con catch-up si estuvo caído.
 */

type PlanRow = {
  id: string;
  user_id: string | null;
  tarjeta_id: string | null;
  concepto: string;
  monto_total: number | string;
  num_cuotas: number;
  categoria: string;
  tipo: string;
  fecha_inicio: string;
  dia_facturacion: number;
  persona: string | null;
  cuotas_generadas: number;
  estado: string;
};

function rowToPlan(r: PlanRow): PlanCuotas {
  return PlanCuotasSchema.parse({
    id: r.id,
    tarjetaId: r.tarjeta_id,
    concepto: r.concepto,
    montoTotal: Number(r.monto_total),
    numCuotas: r.num_cuotas,
    categoria: r.categoria,
    tipo: r.tipo,
    fechaInicio: r.fecha_inicio,
    diaFacturacion: r.dia_facturacion,
    persona: r.persona,
    cuotasGeneradas: r.cuotas_generadas,
    estado: r.estado,
  });
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Lista los planes vivos (activos y completados), del más reciente al más antiguo. */
export async function listPlanes(): Promise<PlanCuotas[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("plan_cuotas")
    .select("*")
    .neq("estado", "cancelado")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listPlanes: ${error.message}`);
  return (data as PlanRow[]).map(rowToPlan);
}

/**
 * Genera las cuotas DEBIDAS de un plan (las que faltan hasta `hoy`) como movimientos y
 * actualiza `cuotas_generadas` (y `estado` a completado al terminar). Idempotente.
 */
async function generarFilaPlan(
  sb: ReturnType<typeof createSupabaseServiceClient>,
  row: PlanRow,
  hoy: string,
): Promise<number> {
  const fechas = fechasCuotas(row.fecha_inicio, row.num_cuotas, row.dia_facturacion);
  const importes = importesCuotas(Number(row.monto_total), row.num_cuotas);
  const debidas = cuotasDebidas(fechas, hoy);

  for (let i = row.cuotas_generadas; i < debidas; i++) {
    const input: CrearMovimientoInput = {
      nombre: `${row.concepto} (${i + 1}/${row.num_cuotas})`,
      importe: importes[i]!,
      categoria: row.categoria as CrearMovimientoInput["categoria"],
      tipo: row.tipo as CrearMovimientoInput["tipo"],
      fecha: fechas[i]!,
      estado: "Pending",
      tarjetaId: row.tarjeta_id,
      persona: row.persona,
    };
    await crearMovimientoNativo(input, row.user_id ?? "");
  }

  if (debidas > row.cuotas_generadas) {
    const estado = debidas >= row.num_cuotas ? "completado" : "activo";
    const { error } = await sb
      .from("plan_cuotas")
      .update({ cuotas_generadas: debidas, estado })
      .eq("id", row.id);
    if (error) throw new Error(`generarFilaPlan(update): ${error.message}`);
  }
  return Math.max(0, debidas - row.cuotas_generadas);
}

/** Worker: genera las cuotas debidas de TODOS los planes activos. */
export async function generarCuotasPendientes(hoy: string = hoyISO()): Promise<number> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("plan_cuotas").select("*").eq("estado", "activo");
  if (error) throw new Error(`generarCuotasPendientes: ${error.message}`);
  let creadas = 0;
  for (const row of data as PlanRow[]) {
    creadas += await generarFilaPlan(sb, row, hoy);
  }
  return creadas;
}

/** Crea un plan y genera de inmediato sus cuotas ya debidas (al menos la cuota 1). */
export async function crearPlanCuotas(
  d: CrearPlanCuotasInput,
  userId: string,
  hoy: string = hoyISO(),
): Promise<string> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("plan_cuotas")
    .insert({
      user_id: userId,
      tarjeta_id: d.tarjetaId,
      concepto: d.concepto,
      monto_total: d.montoTotal,
      num_cuotas: d.numCuotas,
      categoria: d.categoria,
      tipo: d.tipo,
      fecha_inicio: d.fechaInicio,
      dia_facturacion: d.diaFacturacion,
      persona: d.persona?.trim() || null,
      cuotas_generadas: 0,
      estado: "activo",
    })
    .select("*")
    .single();
  if (error) throw new Error(`crearPlanCuotas: ${error.message}`);
  await generarFilaPlan(sb, data as PlanRow, hoy);
  return (data as PlanRow).id;
}

/** Cancela un plan (no se generan más cuotas). Las ya creadas se quedan. */
export async function cancelarPlan(id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("plan_cuotas").update({ estado: "cancelado" }).eq("id", id);
  if (error) throw new Error(`cancelarPlan: ${error.message}`);
}
