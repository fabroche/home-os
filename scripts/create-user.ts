/* eslint-disable no-console */
/**
 * Crea el usuario único de home-os vía Admin API (email_confirm: true → confirmado
 * sin enviar email; útil sin SMTP). Lo ejecutas TÚ en local: tu contraseña no pasa
 * por el chat ni por git.
 *
 * Uso:
 *   1) Añade temporalmente a .env.local:
 *        ADMIN_EMAIL=tu@email.com
 *        ADMIN_PASSWORD=tu_contraseña
 *   2) npm run create:user
 *   3) Borra esas dos líneas de .env.local.
 */
async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // usa variables del shell si no hay .env.local
  }
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error(
      "❌ Faltan ADMIN_EMAIL / ADMIN_PASSWORD. Añádelos temporalmente a .env.local y reintenta.",
    );
    process.exit(1);
  }

  const { createSupabaseServiceClient } = await import("@/lib/supabase/service");
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirmado al instante, sin email
  });
  if (error) {
    console.error("❌ Error creando usuario:", error.message);
    process.exit(1);
  }
  console.log(`✅ Usuario creado y confirmado: ${data.user?.email}`);
  console.log("   Ahora puedes iniciar sesión. Recuerda borrar ADMIN_* de .env.local.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});

export {};
