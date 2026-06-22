import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  RecuperarContextoParamsSchema,
  type RecuperarContextoParams,
  type FragmentoContexto,
  type TipoContexto,
  type EstadoContexto,
} from "@/types/contexto";

/**
 * Recuperación selectiva del banco de contexto (M4 · F-M4-2, RF-M4-003).
 * Sin embeddings de pago (D7): la función SQL `recuperar_contexto` filtra
 * publicado + vigente + tipo/tag y rankea por keyword con FTS de Postgres.
 * La consume la IA (M6) desde el worker (service_role), scope por `userId`.
 */

type RpcArgs = {
  p_user: string;
  p_tipos: TipoContexto[] | null;
  p_tags: string[] | null;
  p_consulta: string | null;
  p_k: number;
};

/** Construye los argumentos de la RPC (puro y testeable, sin tocar la DB). */
export function buildRpcArgs(userId: string, params: RecuperarContextoParams): RpcArgs {
  const p = RecuperarContextoParamsSchema.parse(params);
  const consulta = p.consulta?.trim();
  return {
    p_user: userId,
    p_tipos: p.tipos && p.tipos.length > 0 ? p.tipos : null,
    p_tags: p.tags && p.tags.length > 0 ? p.tags : null,
    p_consulta: consulta && consulta.length > 0 ? consulta : null,
    p_k: p.k,
  };
}

type RpcRow = {
  id: string;
  tipo: TipoContexto;
  titulo: string;
  contenido: string;
  tags: string[] | null;
  score: number;
};

/**
 * Lectura de **awareness** del banco de contexto: lista entradas (incluye
 * borradores) para que el asistente las muestre o evite duplicarlas al PROPONER.
 * ⚠️ NO es para decidir: las decisiones usan `recuperarContexto` (solo publicado).
 */
export async function listarContexto(
  userId: string,
  estados: EstadoContexto[] = ["publicado", "borrador"],
  limite = 50,
): Promise<FragmentoContexto[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("entrada_contexto")
    .select("id, tipo, titulo, contenido, estado")
    .eq("user_id", userId)
    .in("estado", estados)
    .order("updated_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`listarContexto: ${error.message}`);
  type Row = { id: string; tipo: TipoContexto; titulo: string; contenido: string };
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo,
    contenido: r.contenido,
    tags: [],
    score: 0,
  }));
}

export async function recuperarContexto(
  userId: string,
  params: RecuperarContextoParams = {},
): Promise<FragmentoContexto[]> {
  const args = buildRpcArgs(userId, params);
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.rpc("recuperar_contexto", args);
  if (error) throw new Error(`recuperarContexto: ${error.message}`);
  return ((data as RpcRow[] | null) ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo,
    contenido: r.contenido,
    tags: r.tags ?? [],
    score: Number(r.score ?? 0),
  }));
}
