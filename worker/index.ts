/**
 * home-os — WORKER
 *
 * Proceso aparte de la app web. Ejecuta el sync Notion→Supabase de forma
 * periódica (node-cron). Más adelante añadirá: polling de correo (M3),
 * descubrimiento de eventos (M2) y el runner IA headless (M6).
 *
 * Local: `npm run worker` (carga .env.local). En Docker el env viene del contenedor.
 */
import cron from "node-cron";

async function runSync() {
  const started = Date.now();
  try {
    // Import dinámico para que el env ya esté cargado al validar en los módulos.
    const { syncFinanzas } = await import("@/lib/notion/sync/finanzas");
    const res = await syncFinanzas();
    console.warn(
      `[worker] sync OK · ${res.movimientos} movimientos · ${res.deudas} deudas · ${Date.now() - started}ms`,
    );
  } catch (err) {
    console.error("[worker] sync ERROR:", err instanceof Error ? err.message : err);
  }
}

async function runCuotas() {
  try {
    const { generarCuotasPendientes } = await import("@/lib/services/cuotas");
    const creadas = await generarCuotasPendientes();
    if (creadas > 0) console.warn(`[worker] cuotas · ${creadas} cuota(s) generada(s)`);
  } catch (err) {
    console.error("[worker] cuotas ERROR:", err instanceof Error ? err.message : err);
  }
}

async function runRecurrentes() {
  try {
    const { generarRecurrentesPendientes } = await import("@/lib/services/gastos-recurrentes");
    const creados = await generarRecurrentesPendientes();
    if (creados > 0) console.warn(`[worker] recurrentes · ${creados} movimiento(s) generado(s)`);
  } catch (err) {
    console.error("[worker] recurrentes ERROR:", err instanceof Error ? err.message : err);
  }
}

let draining = false;
async function runDrain() {
  if (draining) return; // evita solapamiento entre ticks
  draining = true;
  try {
    const { drenarCola } = await import("@/lib/ai/runner");
    const r = await drenarCola();
    if (r.procesados > 0) {
      console.warn(
        `[worker] ai_jobs · ${r.ok} ok · ${r.reintentos} reintentos · ${r.errores} errores`,
      );
    }
  } catch (err) {
    console.error("[worker] ai_jobs ERROR:", err instanceof Error ? err.message : err);
  } finally {
    draining = false;
  }
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // en Docker/prod el env ya está en process.env
  }
  const { env } = await import("@/config/env");

  if (!cron.validate(env.SYNC_CRON)) {
    console.error(`[worker] SYNC_CRON inválido: "${env.SYNC_CRON}"`);
    process.exit(1);
  }

  console.warn(
    `[worker] iniciando · sync "${env.SYNC_CRON}" · drain ai_jobs cada ${env.AI_POLL_MS}ms`,
  );
  await runSync(); // corrida inicial al arrancar
  await runCuotas(); // genera cuotas debidas al arrancar (catch-up si estuvo caído)
  await runRecurrentes(); // genera recurrentes debidos al arrancar (catch-up)
  cron.schedule(env.SYNC_CRON, runSync);
  cron.schedule("5 0 * * *", runCuotas); // gastos a plazos: una vez al día (00:05)
  cron.schedule("6 0 * * *", runRecurrentes); // gastos recurrentes: una vez al día (00:06)
  setInterval(runDrain, env.AI_POLL_MS); // drena la cola de IA con frecuencia (chat responsivo)
}

main().catch((err) => {
  console.error("[worker] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});

export {};
