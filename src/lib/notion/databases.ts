import "server-only";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notion } from "./client";
import { nq } from "./rate-limit";
import { paginate } from "./paginate";

/**
 * Consulta una DB de Notion devolviendo TODAS las páginas (paginadas, rate-limited).
 * Filtra a `PageObjectResponse` (descarta páginas parciales sin propiedades).
 */
export async function queryDatabase(databaseId: string): Promise<PageObjectResponse[]> {
  return paginate<PageObjectResponse>(async (cursor) => {
    const res = await nq(() =>
      notion.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 }),
    );
    return {
      results: res.results.filter((r): r is PageObjectResponse => "properties" in r),
      has_more: res.has_more,
      next_cursor: res.next_cursor,
    };
  });
}
