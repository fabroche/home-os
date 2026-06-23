import "@/lib/server-guard";
import { spawn } from "node:child_process";
import { env } from "@/config/env";
import { recuperarContexto, listarContexto } from "@/lib/ai/context/retrieve";
import { tomarSiguiente, marcar, reintentar } from "@/lib/ai/jobs";
import { listMovimientos, listDeudas } from "@/lib/services/finanzas";
import { resumen, resumenDeudas, porMes } from "@/lib/finanzas/aggregations";
import { JOB_OUTPUT_SCHEMAS, type AiJob } from "@/types/ai";
import type { FragmentoContexto } from "@/types/contexto";

/**
 * Runner del Asistente IA (M6 · F-M6-2/3). Toma jobs de la cola, arma el prompt
 * (instrucciones + contexto M4 **solo publicado** + esquema de salida), invoca
 * Claude Code headless (`claude -p --output-format json`) y **valida la salida con
 * Zod** antes de persistir. Agnóstico al motor: `invocar` es lo único específico
 * de Claude (inyectable para tests / modo API key). Lo ejecuta el worker.
 */

/** Texto de entrada del usuario según el tipo de tarea. */
function textoEntrada(job: AiJob): string {
  const p = (job.payload ?? {}) as Record<string, unknown>;
  if (job.tipo === "consulta_rag") return String(p.pregunta ?? "");
  if (job.tipo === "proponer_contexto") return String(p.peticion ?? "");
  return "";
}

/** Construye el prompt (puro y testeable). `datos` = snapshot financiero (consulta_rag). */
export function construirPrompt(job: AiJob, fragmentos: FragmentoContexto[], datos?: string): string {
  const contexto = fragmentos.length
    ? fragmentos.map((f, i) => `[#${i + 1}] (id:${f.id}) ${f.titulo}\n${f.contenido}`).join("\n\n")
    : "(sin contexto relevante)";
  const entrada = textoEntrada(job);

  if (job.tipo === "consulta_rag") {
    return [
      "Eres el asistente de home-os (gestión personal). Responde en español, conciso.",
      "Usa los DATOS FINANCIEROS y el CONTEXTO de abajo para responder. Si no alcanzan, dilo.",
      "Devuelve EXCLUSIVAMENTE un JSON válido con esta forma, sin texto extra ni markdown:",
      '{ "respuesta": string, "fuentes": [ { "id": string, "titulo": string } ] }',
      "En `fuentes` cita solo los fragmentos de CONTEXTO que usaste (su id y título).",
      "",
      "=== DATOS FINANCIEROS ===",
      datos ?? "(no disponibles)",
      "",
      "=== CONTEXTO ===",
      contexto,
      "",
      "=== PREGUNTA ===",
      entrada,
    ].join("\n");
  }

  // proponer_contexto
  return [
    "Eres el asistente de home-os. El usuario quiere registrar conocimiento en su banco de contexto.",
    "Propón uno o más borradores de entrada a partir de su PETICIÓN; no dupliques lo que ya exista.",
    "Tipos válidos: regla_financiera, proveedor, preferencia_viaje, contacto, faq, otro.",
    "Devuelve EXCLUSIVAMENTE un JSON válido, sin markdown:",
    '{ "borradores": [ { "tipo": string, "titulo": string, "contenido": string, "tags": [string] } ] }',
    "",
    "=== CONTEXTO EXISTENTE (publicado) ===",
    contexto,
    "",
    "=== PETICIÓN ===",
    entrada,
  ].join("\n");
}

/** Extrae el objeto JSON de la salida del modelo (tolera fences ```json y texto). */
export function extraerJson(texto: string): unknown {
  const fence = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cuerpo = (fence ? fence[1]! : texto).trim();
  const ini = cuerpo.indexOf("{");
  const fin = cuerpo.lastIndexOf("}");
  const slice = ini >= 0 && fin > ini ? cuerpo.slice(ini, fin + 1) : cuerpo;
  return JSON.parse(slice);
}

/** Invoca Claude Code headless y devuelve el texto de la respuesta (`result`). */
function invocarClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(env.CLAUDE_CLI_PATH, ["-p", "--output-format", "json"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude salió con código ${code}: ${err.slice(0, 300)}`));
      try {
        const envelope = JSON.parse(out) as { result?: unknown };
        resolve(typeof envelope.result === "string" ? envelope.result : out);
      } catch {
        resolve(out); // sin envelope JSON: devolver crudo y que extraerJson lo intente
      }
    });
    child.stdin.end(prompt);
  });
}

/** Snapshot compacto de finanzas (single-user) para que el asistente responda con cifras. */
async function snapshotFinanzas(): Promise<string> {
  const [movs, deudas] = await Promise.all([listMovimientos(), listDeudas()]);
  const r = resumen(movs);
  const rd = resumenDeudas(deudas);
  const meses = porMes(movs).slice(0, 3);
  const eur = (n: number) => `${n.toFixed(2)} €`;
  const lineas = [
    `Balance global: ${eur(r.balance)}`,
    `Ingresos totales: ${eur(r.ingresos)} · Gastos totales: ${eur(r.gastos)}`,
    `Deudas: por pagar ${eur(rd.total)} · por cobrar ${eur(rd.totalPorCobrar)}`,
    `Movimientos registrados: ${r.total}`,
  ];
  if (meses.length) {
    lineas.push(
      `Últimos meses (balance): ${meses.map((m) => `${m.mes}: ${eur(m.balance)}`).join(" · ")}`,
    );
  }
  return lineas.join("\n");
}

export type RunnerDeps = {
  invocar: (prompt: string) => Promise<string>;
  recuperar: typeof recuperarContexto;
  listar: typeof listarContexto;
  finanzas: () => Promise<string>;
};
const defaultDeps: RunnerDeps = {
  invocar: invocarClaude,
  recuperar: recuperarContexto,
  listar: listarContexto,
  finanzas: snapshotFinanzas,
};

/**
 * Ejecuta un job: obtiene el contexto adecuado, arma el prompt, invoca el motor y
 * **valida la salida con Zod**. Lanza si no conforma (→ error reintentable).
 * `consulta_rag` decide con contexto **publicado**; `proponer_contexto` usa la
 * lectura de **awareness** (incluye borradores) solo para no duplicar.
 */
export async function ejecutarJob(job: AiJob, deps: RunnerDeps = defaultDeps): Promise<unknown> {
  const schema = JOB_OUTPUT_SCHEMAS[job.tipo as keyof typeof JOB_OUTPUT_SCHEMAS];
  if (!schema) throw new Error(`ejecutarJob: tipo sin contrato de salida: ${job.tipo}`);

  const fragmentos =
    job.tipo === "proponer_contexto"
      ? await deps.listar(job.userId)
      : await deps.recuperar(job.userId, { consulta: textoEntrada(job), k: 8 });
  const datos = job.tipo === "consulta_rag" ? await deps.finanzas() : undefined;
  const prompt = construirPrompt(job, fragmentos, datos);
  const raw = await deps.invocar(prompt);
  return schema.parse(extraerJson(raw)); // ZodError ⇒ el job se marca error (reintentable)
}

/** Backoff exponencial con tope (puro): intento 1→base, 2→2×base, … */
export function backoffMs(intentos: number, baseMs = 2000, capMs = 60000): number {
  return Math.min(capMs, baseMs * 2 ** Math.max(0, intentos - 1));
}

export type ResumenDrain = { procesados: number; ok: number; reintentos: number; errores: number };

/**
 * Drena la cola: toma jobs listos hasta vaciarla. Cada job: ok, o si falla y aún
 * quedan intentos → re-encola con backoff (reintentable), o error terminal. Los
 * re-encolados no se vuelven a tomar en esta pasada (su next_attempt_at es futuro).
 */
export async function drenarCola(
  deps: Partial<RunnerDeps> = {},
  maxReintentos = 3,
): Promise<ResumenDrain> {
  const d = { ...defaultDeps, ...deps };
  const resumen: ResumenDrain = { procesados: 0, ok: 0, reintentos: 0, errores: 0 };
  for (;;) {
    const job = await tomarSiguiente();
    if (!job) break;
    resumen.procesados++;
    try {
      const resultado = await ejecutarJob(job, d);
      await marcar(job.id, "ok", { resultado });
      resumen.ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (job.intentos < maxReintentos) {
        await reintentar(job.id, backoffMs(job.intentos), msg);
        resumen.reintentos++;
      } else {
        await marcar(job.id, "error", { error: msg });
        resumen.errores++;
      }
    }
  }
  return resumen;
}
