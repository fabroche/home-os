import "@/lib/server-guard";
import { Client } from "@notionhq/client";
import { requireEnv } from "@/config/env";

/**
 * Cliente Notion singleton. Fail-fast: si falta NOTION_API_KEY lanza error claro
 * (anti-patrón A4/A11: nada de `auth: secret ?? ""` que construye un cliente inválido).
 */
export const notion = new Client({
  auth: requireEnv("NOTION_API_KEY"),
  // El SDK trae node-fetch@2, que falla con "Premature close" contra Cloudflare
  // desde ciertos egress (p. ej. el VPS). Forzamos el fetch nativo de Node (undici),
  // que maneja bien el cierre de conexión de Cloudflare. Diagnóstico: prueba A/B
  // en el VPS (mismo endpoint, mismo segundo) — undici OK, node-fetch falla.
  fetch: (url, init) => fetch(url, init),
});
