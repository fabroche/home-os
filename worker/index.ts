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

  console.warn(`[worker] iniciando · sync finanzas con cron "${env.SYNC_CRON}"`);
  await runSync(); // corrida inicial al arrancar
  cron.schedule(env.SYNC_CRON, runSync);
}

main().catch((err) => {
  console.error("[worker] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});

export {};
