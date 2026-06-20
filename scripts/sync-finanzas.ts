/* eslint-disable no-console */
/**
 * Ejecuta el sync Notion → Supabase de finanzas. Uso: npm run sync:finanzas
 * (carga .env.local). El worker hará esto en un cron; este script es para
 * disparo manual y verificación.
 */
async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // usa variables del shell si no hay .env.local
  }
  // import dinámico DESPUÉS de cargar el env (los módulos validan env al importar).
  const { syncFinanzas } = await import("@/lib/notion/sync/finanzas");
  const res = await syncFinanzas();
  console.log(`✅ Sync OK · ${res.movimientos} movimientos · ${res.deudas} deudas`);
}

main().catch((err: unknown) => {
  console.error("❌ Sync ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});

export {};

