import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  CuentaSchema,
  TarjetaSchema,
  type Cuenta,
  type Tarjeta,
  type CrearCuentaInput,
  type CrearTarjetaInput,
} from "@/types/cuentas";

/**
 * Servicio de dominio de CUENTAS y TARJETAS (nativo Supabase). Lectura de activos y
 * escritura directa (la app es la fuente de verdad). `user_id` explícito (multi-tenant).
 */

type CuentaRow = {
  id: string;
  nombre: string | null;
  tipo: string | null;
  saldo_inicial: number | string | null;
  activo: boolean;
};

type TarjetaRow = {
  id: string;
  cuenta_id: string | null;
  nombre: string | null;
  tipo: string | null;
  limite: number | string | null;
  dia_corte: number | null;
  dia_pago: number | null;
  activo: boolean;
};

function rowToCuenta(r: CuentaRow): Cuenta {
  return CuentaSchema.parse({
    id: r.id,
    nombre: r.nombre ?? "",
    tipo: r.tipo ?? "corriente",
    saldoInicial: r.saldo_inicial == null ? 0 : Number(r.saldo_inicial),
    activo: r.activo,
  });
}

function rowToTarjeta(r: TarjetaRow): Tarjeta {
  return TarjetaSchema.parse({
    id: r.id,
    cuentaId: r.cuenta_id,
    nombre: r.nombre ?? "",
    tipo: r.tipo ?? "debito",
    limite: r.limite == null ? null : Number(r.limite),
    diaCorte: r.dia_corte,
    diaPago: r.dia_pago,
    activo: r.activo,
  });
}

export async function listCuentas(): Promise<Cuenta[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("cuenta")
    .select("*")
    .eq("activo", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listCuentas: ${error.message}`);
  return (data as CuentaRow[]).map(rowToCuenta);
}

export async function listTarjetas(): Promise<Tarjeta[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("tarjeta")
    .select("*")
    .eq("activo", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listTarjetas: ${error.message}`);
  return (data as TarjetaRow[]).map(rowToTarjeta);
}

export async function crearCuenta(d: CrearCuentaInput, userId: string): Promise<string> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("cuenta")
    .insert({ user_id: userId, nombre: d.nombre, tipo: d.tipo, saldo_inicial: d.saldoInicial, activo: true })
    .select("id")
    .single();
  if (error) throw new Error(`crearCuenta: ${error.message}`);
  return data!.id as string;
}

export async function archivarCuenta(id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("cuenta").update({ activo: false }).eq("id", id);
  if (error) throw new Error(`archivarCuenta: ${error.message}`);
}

export async function crearTarjeta(d: CrearTarjetaInput, userId: string): Promise<string> {
  const sb = createSupabaseServiceClient();
  // Las propiedades de crédito solo aplican a tarjetas de crédito.
  const credito = d.tipo === "credito";
  const { data, error } = await sb
    .from("tarjeta")
    .insert({
      user_id: userId,
      cuenta_id: d.cuentaId,
      nombre: d.nombre,
      tipo: d.tipo,
      limite: credito ? d.limite : null,
      dia_corte: credito ? d.diaCorte : null,
      dia_pago: credito ? d.diaPago : null,
      activo: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`crearTarjeta: ${error.message}`);
  return data!.id as string;
}

export async function archivarTarjeta(id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tarjeta").update({ activo: false }).eq("id", id);
  if (error) throw new Error(`archivarTarjeta: ${error.message}`);
}
