import "@/lib/server-guard";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/config/env";

/**
 * Cliente Supabase con **service_role** — solo servidor/worker (bypassa RLS).
 * Lo usa el sync (escritura) y, de forma interina, los Server Components para
 * leer mientras no exista auth (M7). NUNCA debe llegar al cliente/navegador.
 */
export function createSupabaseServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
