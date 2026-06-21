import "@/lib/server-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EntradaContextoSchema, type EntradaContexto } from "@/types/contexto";

/**
 * Lectura del banco de contexto para la UI (M4). Usa el cliente con RLS
 * (anon + cookies): el usuario solo ve sus propias entradas.
 */

type Row = {
  id: string;
  tipo: string;
  titulo: string;
  contenido: string;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
  entrada_contexto_tag: { tag: string }[] | null;
};

function rowToEntrada(r: Row): EntradaContexto {
  return EntradaContextoSchema.parse({
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo,
    contenido: r.contenido,
    tags: (r.entrada_contexto_tag ?? []).map((t) => t.tag).sort(),
    vigenteDesde: r.vigente_desde,
    vigenteHasta: r.vigente_hasta,
    estado: r.estado,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

/** Todas las entradas del usuario (más recientes primero), con sus tags. */
export async function listEntradas(): Promise<EntradaContexto[]> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("entrada_contexto")
    .select("*, entrada_contexto_tag(tag)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listEntradas: ${error.message}`);
  return (data as Row[]).map(rowToEntrada);
}
