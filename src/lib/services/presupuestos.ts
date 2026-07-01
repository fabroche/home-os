import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { PresupuestoSchema, type Presupuesto, type CrearPresupuestoInput } from "@/types/presupuestos";

/**
 * Servicio de PRESUPUESTOS (nativo Supabase). Tope mensual por categoría; único por
 * (usuario, categoría) → guardar hace upsert. `user_id` explícito (multi-tenant).
 */

type PresupuestoRow = {
  id: string;
  categoria: string | null;
  monto: number | string | null;
};

function rowToPresupuesto(r: PresupuestoRow): Presupuesto {
  return PresupuestoSchema.parse({
    id: r.id,
    categoria: r.categoria ?? "",
    monto: r.monto == null ? 0 : Number(r.monto),
  });
}

export async function listPresupuestos(): Promise<Presupuesto[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("presupuesto")
    .select("id, categoria, monto")
    .order("categoria", { ascending: true });
  if (error) throw new Error(`listPresupuestos: ${error.message}`);
  return (data as PresupuestoRow[]).map(rowToPresupuesto);
}

/** Fija (o actualiza) el tope de una categoría. Upsert por (user_id, categoria). Devuelve `id`. */
export async function guardarPresupuesto(d: CrearPresupuestoInput, userId: string): Promise<string> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("presupuesto")
    .upsert({ user_id: userId, categoria: d.categoria, monto: d.monto }, { onConflict: "user_id,categoria" })
    .select("id")
    .single();
  if (error) throw new Error(`guardarPresupuesto: ${error.message}`);
  return data!.id as string;
}

export async function borrarPresupuesto(id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("presupuesto").delete().eq("id", id);
  if (error) throw new Error(`borrarPresupuesto: ${error.message}`);
}
