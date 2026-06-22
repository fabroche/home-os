import "@/lib/server-guard";
import { z } from "zod";

/**
 * Validación de variables de entorno (fail-fast) con Zod.
 *
 * Anti-patrón que evitamos (visto en el experimento Notion previo): leer
 * `process.env.X ?? ""` disperso por el código y construir clientes con strings
 * vacíos que fallan en runtime de forma silenciosa. Aquí se valida UNA vez.
 *
 * Las variables de integración son `optional()` para que el scaffold compile y
 * arranque sin credenciales; cada módulo, al implementarse, endurece (`.min(1)`)
 * las que necesita o usa `requireEnv()`.
 */
const envSchema = z.object({
  // App
  APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().optional(),
  SYNC_CRON: z.string().default("*/15 * * * *"), // worker: frecuencia del sync (cron 5 campos)
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),

  // Notion
  NOTION_API_KEY: z.string().optional(),
  NOTION_WEBHOOK_SECRET: z.string().optional(),
  NOTION_DB_PRESUPUESTO_ID: z.string().optional(), // por defecto en lib/notion/schema.ts
  NOTION_DB_DEUDAS_ID: z.string().optional(),

  // Google (Gmail + Calendar)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // SMTP (notificaciones salientes)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Cifrado de credenciales de cuentas en BD
  ACCOUNT_ENCRYPTION_KEY: z.string().optional(),

  // IA de runtime — Claude Code headless (suscripción, sin API key)
  CLAUDE_CLI_PATH: z.string().default("claude"),
  CLAUDE_WORKDIR: z.string().default("./worker/agent"),
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(), // `claude setup-token` (~1 año); lo lee el runner
  AI_POLL_MS: z.coerce.number().int().positive().default(3000), // frecuencia del drain de ai_jobs
});

// Trata las variables vacías ("") como ausentes, para que los placeholders
// vacíos de .env.example no rompan la validación de campos opcionales.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuración de entorno inválida. Revisa .env.local (ver .env.example).");
}

export const env = parsed.data;
export type Env = typeof env;

/** Exige que una variable opcional esté presente (usar en los módulos que la necesiten). */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Falta la variable de entorno requerida: ${String(key)} (ver .env.example).`);
  }
  return value as NonNullable<Env[K]>;
}
