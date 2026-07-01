import "@/lib/server-guard";
import { spawn } from "node:child_process";
import { env } from "@/config/env";
import { recuperarContexto, listarContexto } from "@/lib/ai/context/retrieve";
import { tomarSiguiente, marcar, reintentar } from "@/lib/ai/jobs";
import { CuotaAgotadaError, detectarCuota, esCuotaAgotada } from "@/lib/ai/errors";
import { listMovimientos, listDeudas } from "@/lib/services/finanzas";
import { listCuentas, listTarjetas } from "@/lib/services/cuentas";
import {
  resumen,
  resumenDeudas,
  porMes,
  gastosPorCategoria,
  ingresosPorCategoria,
} from "@/lib/finanzas/aggregations";
import { JOB_OUTPUT_SCHEMAS, type AiJob } from "@/types/ai";
import { especificacionTools } from "@/types/ai-tools";
import { CATEGORIAS, TIPOS, PERSONAS_DEUDA } from "@/types/finanzas";
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
  if (job.tipo === "asistente") return String(p.mensaje ?? "");
  return String(p.peticion ?? ""); // resto de tareas usan `peticion`
}

/** Formatea la conversación reciente (`payload.historial`) para el prompt del router. */
function historialTexto(job: AiJob): string {
  const h = (job.payload as { historial?: { rol: string; texto: string }[] } | null)?.historial;
  if (!h?.length) return "(sin conversación previa)";
  return h.map((t) => `${t.rol === "user" ? "Usuario" : "Asistente"}: ${t.texto}`).join("\n");
}

/** Construye el prompt (puro y testeable). `datos` = snapshot financiero (consulta_rag). */
export function construirPrompt(job: AiJob, fragmentos: FragmentoContexto[], datos?: string): string {
  const contexto = fragmentos.length
    ? fragmentos.map((f, i) => `[#${i + 1}] (id:${f.id}) ${f.titulo}\n${f.contenido}`).join("\n\n")
    : "(sin contexto relevante)";
  const entrada = textoEntrada(job);

  if (job.tipo === "asistente") {
    const tiposGasto = TIPOS.filter((t) => t.startsWith("Gasto"));
    const tiposIngreso = TIPOS.filter((t) => t.startsWith("Ingreso"));
    return [
      "Eres el asistente de home-os (gestión personal, un solo usuario). Lee el MENSAJE y decide",
      "qué quiere el usuario. Devuelves SIEMPRE UNA sola acción. Tú NUNCA ejecutas ni escribes nada:",
      "solo PROPONES; el usuario confirma después.",
      "",
      "Acciones (campo `accion`):",
      '- "responder": responder una pregunta o dar un insight con CIFRAS EXACTAS de los DATOS',
      '  (p.ej. "¿en qué gasto más?", "¿a quién debo más?", "¿cuál es mi ingreso principal?").',
      '- "gasto" / "ingreso": registrar un movimiento NUEVO que el usuario hizo.',
      '- "deuda": registrar una deuda o un pago de deuda con una persona.',
      '- "pagado": marcar como pagado uno de los GASTOS PENDIENTES que YA existen (abajo).',
      '- "borrar": ELIMINAR un movimiento o una deuda que YA existe (ej.: "borra el gasto del café").',
      '- "contexto": guardar conocimiento en su banco (preferencias, proveedores, reglas…).',
      '- "herramienta": CREAR una entidad de finanzas (cuenta, tarjeta, plan de cuotas a plazos,',
      "  presupuesto o gasto recurrente). Elige la herramienta y rellena sus campos.",
      '- "aclarar": SOLO si el mensaje podría interpretarse razonablemente de MÁS DE UNA forma',
      '  (ej.: "ya pagué la luz" puede ser un gasto nuevo, o marcar como pagada una luz que ya está',
      "  en GASTOS PENDIENTES). No inventes ambigüedad donde no la hay: si está claro, no preguntes.",
      "",
      "Reglas:",
      "- Usa la FECHA DE HOY de abajo si no se indica otra (formato YYYY-MM-DD).",
      `- categoria DEBE ser una de: ${CATEGORIAS.join(", ")}.`,
      `- tipo de gasto: ${tiposGasto.join(", ")} (por defecto "Gasto Variable").`,
      `- tipo de ingreso: ${tiposIngreso.join(", ")} (por defecto "Ingreso Variable").`,
      `- Personas de deuda conocidas: ${PERSONAS_DEUDA.join(", ")} (si menciona otra, úsala tal cual).`,
      '- importe/valor = número positivo en euros (magnitud). estado de movimiento = "Pending".',
      '- En "pagado" busca en GASTOS PENDIENTES: si SOLO uno encaja → movimiento con su id EXACTO,',
      "  candidatos:[]; si VARIOS encajan → movimiento:null y candidatos con todos (máx 8) para elegir;",
      "  si ninguno → movimiento:null, candidatos:[].",
      '- En "borrar" busca en MOVIMIENTOS Y DEUDAS (abajo) lo que pide el usuario:',
      '  · si SOLO uno encaja con claridad → objetivo con su id EXACTO y tipo ("movimiento"|"deuda"), candidatos:[].',
      '  · si VARIOS encajan (ej. "un gasto de comida" y hay varios) → objetivo:null y candidatos con TODOS los',
      "    que encajen (máx 8, cada uno con id+tipo+nombre) para que el usuario elija; NO adivines uno.",
      "  · si ninguno encaja → objetivo:null, candidatos:[] y dilo en `nota`.",
      "  Solo PROPONES el borrado: el usuario lo confirma después.",
      '- Una PREGUNTA nunca es una acción de registro: "¿en qué gasto más?" es "responder", no "gasto".',
      '- En "herramienta" elige `herramienta` de la lista de HERRAMIENTAS y rellena `propuesta` con sus',
      "  campos; para cuentaId/tarjetaId usa el id EXACTO de la lista CUENTAS Y TARJETAS de abajo. Si te",
      "  falta un dato obligatorio, devuelve propuesta:null y dilo en `nota`.",
      "- Si falta info para registrar (p.ej. el importe), usa esa acción con propuesta:null y dilo en `nota`.",
      "- Si el MENSAJE corrige o ajusta una propuesta anterior de la CONVERSACIÓN RECIENTE (cambia",
      "  importe, fecha, persona, concepto…), vuelve a proponer la MISMA acción con los datos YA",
      '  corregidos (ej.: "no, fue hace 2 días" → la misma propuesta con la fecha recalculada). No',
      "  empieces de cero ni vuelvas a pedir lo que ya se dijo.",
      "",
      "Devuelve EXCLUSIVAMENTE un JSON válido, sin markdown, con UNA de estas formas:",
      '{ "accion": "responder", "respuesta": string, "fuentes": [ { "id": string, "titulo": string } ] }',
      '{ "accion": "gasto"|"ingreso", "propuesta": { "nombre": string, "importe": number, "categoria": string, "tipo": string, "fecha": "YYYY-MM-DD", "estado": "Pending" } | null, "nota": string }',
      '{ "accion": "deuda", "propuesta": { "concepto": string, "persona": string, "valor": number, "movimiento": "deuda"|"pago", "fecha": "YYYY-MM-DD" } | null, "nota": string }',
      '{ "accion": "pagado", "movimiento": { "id": string, "nombre": string, "importe": number } | null, "candidatos": [ { "id": string, "nombre": string, "importe": number } ], "nota": string }',
      '{ "accion": "borrar", "objetivo": { "tipo": "movimiento"|"deuda", "id": string, "nombre": string } | null, "candidatos": [ { "tipo": "movimiento"|"deuda", "id": string, "nombre": string } ], "nota": string }',
      '{ "accion": "contexto", "borradores": [ { "tipo": string, "titulo": string, "contenido": string, "tags": [string] } ] }',
      '{ "accion": "herramienta", "herramienta": string, "propuesta": { …campos de la herramienta… } | null, "nota": string }',
      '{ "accion": "aclarar", "pregunta": string, "opciones": [ { "etiqueta": string, "accion": "responder"|"gasto"|"ingreso"|"deuda"|"pagado"|"contexto" } ] }',
      "En `fuentes` cita solo los fragmentos de CONTEXTO que usaste. En `contexto`, tipos válidos:",
      "regla_financiera, proveedor, preferencia_viaje, contacto, faq, otro.",
      "",
      "=== HERRAMIENTAS (para accion 'herramienta'; `herramienta` = uno de estos nombres) ===",
      especificacionTools(),
      "",
      datos ?? "",
      "",
      "=== CONTEXTO (banco de conocimiento, publicado) ===",
      contexto,
      "",
      "=== CONVERSACIÓN RECIENTE (más antiguo→más nuevo) ===",
      historialTexto(job),
      "",
      "=== MENSAJE ===",
      entrada,
    ].join("\n");
  }

  if (job.tipo === "consulta_rag") {
    return [
      "Eres el asistente de home-os (gestión personal). Responde en español, conciso.",
      "Usa los DATOS FINANCIEROS y el CONTEXTO de abajo para responder. Si no alcanzan, dilo.",
      "Da insights con CIFRAS EXACTAS de los DATOS: si preguntan en qué gasta más, a quién",
      "debe más o cuál es su ingreso principal, nombra la categoría/persona concreta y su importe.",
      "No inventes números que no estén en los DATOS.",
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

  if (job.tipo === "registrar_gasto" || job.tipo === "registrar_ingreso") {
    const esIngreso = job.tipo === "registrar_ingreso";
    const concepto = esIngreso ? "INGRESO" : "GASTO";
    const tiposValidos = TIPOS.filter((t) => t.startsWith(esIngreso ? "Ingreso" : "Gasto"));
    const porDefecto = esIngreso ? "Ingreso Variable" : "Gasto Variable";
    const hoy = datos ?? "";
    return [
      `Eres el asistente de home-os. El usuario quiere registrar un ${concepto} a partir de su PETICIÓN.`,
      "Extrae los campos y PROPÓN el movimiento (no lo ejecutas tú; el usuario lo confirmará).",
      `Hoy es ${hoy}. Si no indica fecha, usa la de hoy (formato YYYY-MM-DD).`,
      `categoria DEBE ser una de: ${CATEGORIAS.join(", ")}.`,
      `tipo DEBE ser uno de: ${tiposValidos.join(", ")} (elige el más razonable; por defecto "${porDefecto}").`,
      `importe = número positivo en euros (la magnitud del ${concepto.toLowerCase()}). estado = "Pending".`,
      `nombre = una descripción corta del ${concepto.toLowerCase()}.`,
      "Si NO puedes deducir el importe, devuelve propuesta: null y explica qué falta en `nota`.",
      "Devuelve EXCLUSIVAMENTE un JSON válido, sin markdown, con esta forma:",
      '{ "propuesta": { "nombre": string, "importe": number, "categoria": string, "tipo": string, "fecha": "YYYY-MM-DD", "estado": "Pending" } | null, "nota": string }',
      "",
      "=== PETICIÓN ===",
      entrada,
    ].join("\n");
  }

  if (job.tipo === "registrar_deuda") {
    const hoy = datos ?? "";
    return [
      "Eres el asistente de home-os. El usuario quiere registrar una DEUDA o un PAGO de deuda con una persona.",
      "Extrae los campos y PROPÓN el registro (no lo ejecutas tú; el usuario lo confirmará).",
      `Hoy es ${hoy}. Si no indica fecha, usa la de hoy (YYYY-MM-DD).`,
      `Personas conocidas: ${PERSONAS_DEUDA.join(", ")} (si menciona otra, usa ese nombre tal cual).`,
      'movimiento = "deuda" si nace o crece lo que se debe; "pago" si se salda o devuelve.',
      "valor = número positivo en euros (magnitud). concepto = descripción corta.",
      "Si te falta la persona o el importe, devuelve propuesta: null y explícalo en `nota`.",
      "Devuelve EXCLUSIVAMENTE un JSON válido, sin markdown:",
      '{ "propuesta": { "concepto": string, "persona": string, "valor": number, "movimiento": "deuda"|"pago", "fecha": "YYYY-MM-DD" } | null, "nota": string }',
      "",
      "=== PETICIÓN ===",
      entrada,
    ].join("\n");
  }

  if (job.tipo === "marcar_pagado") {
    const lista = datos || "(no hay gastos pendientes)";
    return [
      "Eres el asistente de home-os. El usuario quiere MARCAR como pagado uno de sus gastos PENDIENTES.",
      "Busca en la LISTA lo que pide:",
      "· si SOLO uno coincide con claridad → movimiento con su id EXACTO, candidatos:[].",
      '· si VARIOS coinciden (ej. "un gasto de comida" y hay varios) → movimiento:null y candidatos con TODOS',
      "  los que coincidan (máx 8) para que el usuario elija; NO adivines uno.",
      "· si ninguno coincide → movimiento:null, candidatos:[] y pide una aclaración en `nota`.",
      "Devuelve EXCLUSIVAMENTE un JSON válido, sin markdown:",
      '{ "movimiento": { "id": string, "nombre": string, "importe": number } | null, "candidatos": [ { "id": string, "nombre": string, "importe": number } ], "nota": string }',
      "",
      "=== GASTOS PENDIENTES ===",
      lista,
      "",
      "=== PETICIÓN ===",
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
      // La cuota agotada puede salir con código 0 (envelope is_error) o no-cero, y el
      // aviso aparece en stdout o stderr → la buscamos sobre todo el output, primero.
      const cuota = detectarCuota(`${out}\n${err}`);
      if (cuota.agotada) return reject(new CuotaAgotadaError(cuota.reset));
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

/**
 * Snapshot compacto de finanzas (single-user) para que el asistente responda con
 * cifras DURAS: totales, desglose por categoría (gasto e ingreso) y deuda neta por
 * persona. Es la base de los insights ("en qué gasto más", "a quién debo más",
 * "cuál es mi ingreso principal").
 */
async function snapshotFinanzas(): Promise<string> {
  const [movs, deudas] = await Promise.all([listMovimientos(), listDeudas()]);
  const r = resumen(movs);
  const rd = resumenDeudas(deudas);
  const meses = porMes(movs).slice(0, 3);
  const gastosCat = gastosPorCategoria(movs).slice(0, 6);
  const ingresosCat = ingresosPorCategoria(movs).slice(0, 5);
  const eur = (n: number) => `${n.toFixed(2)} €`;
  const cats = (xs: { categoria: string; total: number }[]) =>
    xs.map((c) => `${c.categoria} ${eur(c.total)}`).join(" · ");
  const pers = (xs: { persona: string; total: number }[]) =>
    xs.map((p) => `${p.persona} ${eur(p.total)}`).join(" · ");

  const lineas = [
    `Balance global: ${eur(r.balance)}`,
    `Ingresos totales: ${eur(r.ingresos)} · Gastos totales: ${eur(r.gastos)} · Movimientos: ${r.total}`,
  ];
  if (gastosCat.length) lineas.push(`Gasto por categoría (mayor→menor): ${cats(gastosCat)}`);
  if (ingresosCat.length) lineas.push(`Ingreso por categoría/fuente (mayor→menor): ${cats(ingresosCat)}`);
  lineas.push(
    rd.porPersona.length
      ? `Le debes (por pagar, mayor→menor): ${pers(rd.porPersona)}`
      : "No tienes deudas pendientes de pago.",
  );
  if (rd.porCobrar.length) lineas.push(`Te deben (por cobrar): ${pers(rd.porCobrar)}`);
  lineas.push(`Total deuda: por pagar ${eur(rd.total)} · por cobrar ${eur(rd.totalPorCobrar)}`);
  if (meses.length) {
    lineas.push(
      `Últimos meses (ingresos/gastos/balance): ${meses
        .map((m) => `${m.mes}: +${eur(m.ingresos)} / -${eur(m.gastos)} = ${eur(m.balance)}`)
        .join(" · ")}`,
    );
  }
  return lineas.join("\n");
}

/** Lista de gastos PENDIENTES (con su `id` nativo) para que la IA elija al marcar pagado. */
async function movimientosPendientes(): Promise<string> {
  const movs = await listMovimientos();
  const pend = movs
    .filter((m) => m.estado === "Pending" && m.flujo === "gasto")
    .slice(0, 40);
  if (!pend.length) return "(no hay gastos pendientes)";
  return pend
    .map(
      (m) =>
        `id:${m.id} | ${m.nombre} | ${Math.abs(m.importe ?? 0).toFixed(2)} € | ${m.fecha ?? "sin fecha"}`,
    )
    .join("\n");
}

/** Lista de movimientos y deudas (con su `id` nativo) que la IA puede proponer BORRAR. */
async function borrables(): Promise<string> {
  const [movs, deudas] = await Promise.all([listMovimientos(), listDeudas()]);
  const m = movs
    .slice(0, 40)
    .map((x) => `id:${x.id} | ${x.nombre} | ${Math.abs(x.importe ?? 0).toFixed(2)} € | ${x.fecha ?? "sin fecha"} | ${x.estado ?? ""}`);
  const d = deudas
    .slice(0, 40)
    .map((x) => `id:${x.id} | ${x.concepto} | ${x.persona ?? "—"} | ${(x.valor ?? 0).toFixed(2)} €`);
  return [
    "MOVIMIENTOS:",
    m.length ? m.join("\n") : "(ninguno)",
    "",
    "DEUDAS:",
    d.length ? d.join("\n") : "(ninguna)",
  ].join("\n");
}

/** Lista de cuentas y tarjetas (id + nombre) para que la IA rellene cuentaId/tarjetaId. */
async function entidadesFinanzas(): Promise<string> {
  const [cuentas, tarjetas] = await Promise.all([listCuentas(), listTarjetas()]);
  const c = cuentas.map((x) => `id:${x.id} | ${x.nombre} | ${x.tipo}`);
  const t = tarjetas.map((x) => `id:${x.id} | ${x.nombre} | ${x.tipo}`);
  return [
    "CUENTAS:",
    c.length ? c.join("\n") : "(ninguna)",
    "",
    "TARJETAS:",
    t.length ? t.join("\n") : "(ninguna)",
  ].join("\n");
}

export type RunnerDeps = {
  invocar: (prompt: string) => Promise<string>;
  recuperar: typeof recuperarContexto;
  listar: typeof listarContexto;
  finanzas: () => Promise<string>;
  pendientes: () => Promise<string>;
  borrables: () => Promise<string>;
  entidades: () => Promise<string>;
};
const defaultDeps: RunnerDeps = {
  invocar: invocarClaude,
  recuperar: recuperarContexto,
  listar: listarContexto,
  finanzas: snapshotFinanzas,
  pendientes: movimientosPendientes,
  borrables,
  entidades: entidadesFinanzas,
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
      : job.tipo === "consulta_rag" || job.tipo === "asistente"
        ? await deps.recuperar(job.userId, { consulta: textoEntrada(job), k: 8 })
        : []; // las acciones (registrar_*, marcar_pagado) no necesitan contexto del banco
  const hoy = () => new Date().toISOString().slice(0, 10);
  let datos: string | undefined;
  if (job.tipo === "consulta_rag") {
    datos = await deps.finanzas();
  } else if (job.tipo === "asistente") {
    // El router puede acabar en CUALQUIER acción, así que recibe todo lo que podría
    // necesitar (snapshot para responder + pendientes para marcar pagado + borrables
    // para borrar + hoy).
    const [snap, pend, borr, ent] = await Promise.all([
      deps.finanzas(),
      deps.pendientes(),
      deps.borrables(),
      deps.entidades(),
    ]);
    datos = [
      `FECHA DE HOY: ${hoy()}`,
      "",
      "=== DATOS FINANCIEROS ===",
      snap,
      "",
      "=== GASTOS PENDIENTES (formato: id:<id> | nombre | importe | fecha) ===",
      pend,
      "",
      "=== MOVIMIENTOS Y DEUDAS (para borrar; formato id:<id> | …) ===",
      borr,
      "",
      "=== CUENTAS Y TARJETAS (para herramienta cuentaId/tarjetaId; usa el id EXACTO) ===",
      ent,
    ].join("\n");
  } else if (job.tipo === "registrar_gasto" || job.tipo === "registrar_ingreso" || job.tipo === "registrar_deuda") {
    datos = hoy(); // fecha de hoy para el prompt
  } else if (job.tipo === "marcar_pagado") {
    datos = await deps.pendientes(); // lista de gastos pendientes a elegir
  }
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
      // La cuota agotada no se arregla reintentando (se renueva en horas): error terminal.
      if (esCuotaAgotada(e) || job.intentos >= maxReintentos) {
        await marcar(job.id, "error", { error: msg });
        resumen.errores++;
      } else {
        await reintentar(job.id, backoffMs(job.intentos), msg);
        resumen.reintentos++;
      }
    }
  }
  return resumen;
}
