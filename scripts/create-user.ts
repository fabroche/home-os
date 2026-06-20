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
    // Si ya existe, RESETEAR su contraseña (crear-o-actualizar, idempotente).
    if (/registered|already|exists/i.test(error.message)) {
      const { data: list, error: listErr } = await sb.auth.admin.listUsers();
      if (listErr) {
        console.error("❌ Error listando usuarios:", listErr.message);
        process.exit(1);
      }
      const existing = list.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (!existing) {
        console.error(`❌ '${email}' figura como registrado pero no se encontró. ¿Email exacto?`);
        process.exit(1);
      }
      const { error: upErr } = await sb.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (upErr) {
        console.error("❌ Error actualizando contraseña:", upErr.message);
        process.exit(1);
      }
      console.log(`🔄 Usuario existente actualizado (contraseña reseteada + confirmado): ${email}`);
    } else {
      console.error("❌ Error creando usuario:", error.message);
      process.exit(1);
    }
  } else {
    console.log(`✅ Usuario creado y confirmado: ${data.user?.email}`);
  }

  console.log("   Inicia sesión con EXACTAMENTE ese email y contraseña.");
  console.log("   Recuerda borrar ADMIN_* de .env.local después.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});

export {};
