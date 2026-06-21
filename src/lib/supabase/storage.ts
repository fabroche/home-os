import "@/lib/server-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Subida de archivos de finanzas (factura/comprobante) al bucket PÚBLICO `finanzas`.
 * Rutas con uuid no adivinable; devuelve la URL pública permanente (se guarda en
 * Notion como enlace externo y en el espejo de Supabase). Ver migración 0003.
 */
const BUCKET = "finanzas";

export type TipoArchivo = "factura" | "comprobante";

export async function subirArchivoFinanzas(
  pageId: string,
  tipo: TipoArchivo,
  file: File,
): Promise<string> {
  const sb = await createSupabaseServerClient();
  const carpeta = tipo === "factura" ? "facturas" : "comprobantes";
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${carpeta}/${pageId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(`subir archivo: ${error.message}`);

  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
