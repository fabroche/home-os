import { NextResponse } from "next/server";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

/**
 * STUB — Disparador de jobs (sync Notion, polling de correo, descubrimiento de
 * eventos, encolado de tareas IA). Protegido por CRON_SECRET.
 *
 * Lo invoca el scheduler del worker (node-cron) o un cron externo de Dokploy.
 * Ver: docs/transversal/infra-devops.md y docs/modules/M6-asistente-ia.md
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  const { job } = await params;
  const auth = request.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { error: "not_implemented", job, see: "docs/modules/M6-asistente-ia.md" },
    { status: 501 },
  );
}
