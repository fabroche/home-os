import "@/lib/server-guard";
import { Client } from "@notionhq/client";
import { requireEnv } from "@/config/env";

/**
 * Cliente Notion singleton. Fail-fast: si falta NOTION_API_KEY lanza error claro
 * (anti-patrón A4/A11: nada de `auth: secret ?? ""` que construye un cliente inválido).
 */
export const notion = new Client({ auth: requireEnv("NOTION_API_KEY") });
