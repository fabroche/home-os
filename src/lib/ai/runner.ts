import "@/lib/server-guard";
import { spawn } from "node:child_process";
import { env } from "@/config/env";
import { recuperarContexto, listarContexto } from "@/lib/ai/context/retrieve";
import { tomarSiguiente, marcar } from "@/lib/ai/jobs";
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

/** Construye el prompt (puro y testeable). El contexto siempre es publicado. */
export function construirPrompt(job: AiJob, fragmentos: FragmentoContexto[]): string {
  const contexto = fragmentos.length
    ? fragmentos.map((f, i) => `[#${i + 1}] (id:${f.id}) ${f.titulo}\n${f.contenido}`).join("\n\n")
    : "(sin contexto relevante)";
  const entrada = textoEntrada(job);

  if (job.tipo === "consulta_rag") {
    return [
      "Eres el asistente de home-os (gestión personal). Responde en español, conciso.",
      "Usa ÚNICAMENTE el CONTEXTO de abajo (conocimiento publicado del usuario). Si no alcanza, dilo.",
      "Devuelve EXCLUSIVAMENTE un JSON válido con esta forma, sin texto extra ni markdown:",
      '{ "respuesta": string, "fuentes": [ { "id": string, "titulo": string } ] }',
      "En `fuentes` incluye solo los fragmentos que realmente usaste (su id y título).",
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

export type RunnerDeps = {
  invocar: (prompt: string) => Promise<string>;
  recuperar: typeof recuperarContexto;
  listar: typeof listarContexto;
};
const defaultDeps: RunnerDeps = {
  invocar: invocarClaude,
  recuperar: recuperarContexto,
  listar: listarContexto,
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
  const prompt = construirPrompt(job, fragmentos);
  const raw = await deps.invocar(prompt);
  return schema.parse(extraerJson(raw)); // ZodError ⇒ el job se marca error (reintentable)
}

/** Drena la cola: toma jobs hasta vaciarla; cierra cada uno ok|error. Devuelve cuántos procesó. */
export async function drenarCola(deps: Partial<RunnerDeps> = {}): Promise<number> {
  const d = { ...defaultDeps, ...deps };
  let procesados = 0;
  for (;;) {
    const job = await tomarSiguiente();
    if (!job) break;
    try {
      const resultado = await ejecutarJob(job, d);
      await marcar(job.id, "ok", { resultado });
    } catch (e) {
      await marcar(job.id, "error", { error: e instanceof Error ? e.message : String(e) });
    }
    procesados++;
  }
  return procesados;
}
