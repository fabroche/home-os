import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * STUB — Webhook de Notion (sync híbrido Notion → Supabase).
 *
 * A implementar en M1/transversal "integracion-notion":
 *  1. Verificar la firma con NOTION_WEBHOOK_SECRET (rechazar si no coincide).
 *  2. Encolar el evento (no procesar inline) para que el worker sincronice.
 *  3. Responder 200 rápido (Notion reintenta si tarda).
 *
 * Ver: docs/transversal/integracion-notion.md
 */
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", see: "docs/transversal/integracion-notion.md" },
    { status: 501 },
  );
}
