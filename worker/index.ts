/**
 * home-os — WORKER (stub)
 *
 * Proceso aparte de la app web. Responsabilidades (a implementar):
 *  - Scheduler (node-cron): sync Notion↔Supabase, polling de correo, descubrimiento de eventos.
 *  - Runner IA: toma tareas de `ai_jobs` y las ejecuta con Claude Code headless (suscripción).
 *
 * Ver docs/transversal/infra-devops.md y docs/modules/M6-asistente-ia.md
 */
function main() {
  console.warn("[worker] stub — sin jobs configurados todavía. Ver docs/modules/M6-asistente-ia.md");
}

main();

export {};

