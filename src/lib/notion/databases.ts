import "@/lib/server-guard";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notion } from "./client";
import { nq } from "./rate-limit";
import { paginate } from "./paginate";

/**
 * Consulta una DB de Notion devolviendo TODAS las páginas (paginadas, rate-limited).
 * Filtra a `PageObjectResponse` (descarta páginas parciales sin propiedades).
 */
export async function queryDatabase(
  databaseId: string,
  pageSize = 100,
): Promise<PageObjectResponse[]> {
  // page_size al máximo de Notion (100). El "premature close" no era MTU sino el
  // node-fetch@2 del SDK (ver lib/notion/client.ts). El retry de red se mantiene
  // como defensa ante cortes transitorios reales.
  return paginate<PageObjectResponse>(async (cursor) => {
    const res = await nq(() =>
      notion.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: pageSize }),
    );
    return {
      results: res.results.filter((r): r is PageObjectResponse => "properties" in r),
      has_more: res.has_more,
      next_cursor: res.next_cursor,
    };
  });
}
