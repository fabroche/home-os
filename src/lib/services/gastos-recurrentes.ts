import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { crearMovimientoNativo } from "@/lib/services/finanzas";
import { recurrentesDebidos } from "@/lib/finanzas/recurrentes";
import {
  GastoRecurrenteSchema,
  type GastoRecurrente,
  type CrearGastoRecurrenteInput,
} from "@/types/recurrentes";
import type { CrearMovimientoInput } from "@/types/finanzas";

/**
 * Servicio de gastos recurrentes (nativo Supabase). Igual que los gastos a plazos pero sin
 * fin: el worker genera un `movimiento` cada mes en `dia_mes`. Idempotente vía `ultima_generada`
 * (último YYYY-MM creado) + catch-up si el worker estuvo caído.
 */

type RecurrenteRow = {
  id: string;
  user_id: string | null;
  concepto: string;
  monto: number | string;
  categoria: string;
  tipo: string;
  dia_mes: number;
  fecha_inicio: string;
  cuenta_id: string | null;
  tarjeta_id: string | null;
  persona: string | null;
  ultima_generada: string | null;
  activo: boolean;
};

function rowToRecurrente(r: RecurrenteRow): GastoRecurrente {
  return GastoRecurrenteSchema.parse({
    id: r.id,
    concepto: r.concepto,
    monto: Number(r.monto),
    categoria: r.categoria,
    tipo: r.tipo,
    diaMes: r.dia_mes,
    fechaInicio: r.fecha_inicio,
    cuentaId: r.cuenta_id,
    tarjetaId: r.tarjeta_id,
    persona: r.persona,
    ultimaGenerada: r.ultima_generada,
    activo: r.activo,
  });
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Lista los recurrentes activos, del más reciente al más antiguo. */
export async function listRecurrentes(): Promise<GastoRecurrente[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("gasto_recurrente")
    .select("*")
    .eq("activo", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listRecurrentes: ${error.message}`);
  return (data as RecurrenteRow[]).map(rowToRecurrente);
}

/** Genera los meses DEBIDOS de un recurrente como movimientos y avanza `ultima_generada`. */
async function generarFilaRecurrente(
  sb: ReturnType<typeof createSupabaseServiceClient>,
  row: RecurrenteRow,
  hoy: string,
): Promise<number> {
  const debidos = recurrentesDebidos(row.fecha_inicio, row.dia_mes, row.ultima_generada, hoy);
  for (const d of debidos) {
    const input: CrearMovimientoInput = {
      nombre: row.concepto,
      importe: Number(row.monto),
      categoria: row.categoria as CrearMovimientoInput["categoria"],
      tipo: row.tipo as CrearMovimientoInput["tipo"],
      fecha: d.fecha,
      estado: "Pending",
      cuentaId: row.cuenta_id,
      tarjetaId: row.tarjeta_id,
      persona: row.persona,
    };
    await crearMovimientoNativo(input, row.user_id ?? "");
  }
  const ultimo = debidos.at(-1);
  if (ultimo) {
    const { error } = await sb
      .from("gasto_recurrente")
      .update({ ultima_generada: ultimo.mes })
      .eq("id", row.id);
    if (error) throw new Error(`generarFilaRecurrente(update): ${error.message}`);
  }
  return debidos.length;
}

/** Worker: genera los movimientos debidos de TODOS los recurrentes activos. */
export async function generarRecurrentesPendientes(hoy: string = hoyISO()): Promise<number> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("gasto_recurrente").select("*").eq("activo", true);
  if (error) throw new Error(`generarRecurrentesPendientes: ${error.message}`);
  let creados = 0;
  for (const row of data as RecurrenteRow[]) {
    creados += await generarFilaRecurrente(sb, row, hoy);
  }
  return creados;
}

/** Crea un recurrente y genera de inmediato sus meses ya debidos (el del mes en curso si toca). */
export async function crearGastoRecurrente(
  d: CrearGastoRecurrenteInput,
  userId: string,
  hoy: string = hoyISO(),
): Promise<string> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("gasto_recurrente")
    .insert({
      user_id: userId,
      concepto: d.concepto,
      monto: d.monto,
      categoria: d.categoria,
      tipo: d.tipo,
      dia_mes: d.diaMes,
      fecha_inicio: d.fechaInicio,
      cuenta_id: d.cuentaId ?? null,
      tarjeta_id: d.tarjetaId ?? null,
      persona: d.persona?.trim() || null,
      ultima_generada: null,
      activo: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(`crearGastoRecurrente: ${error.message}`);
  await generarFilaRecurrente(sb, data as RecurrenteRow, hoy);
  return (data as RecurrenteRow).id;
}

/** Desactiva un recurrente (deja de generar). Los movimientos ya creados se quedan. */
export async function archivarRecurrente(id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("gasto_recurrente").update({ activo: false }).eq("id", id);
  if (error) throw new Error(`archivarRecurrente: ${error.message}`);
}
