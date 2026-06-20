/**
 * Recorre TODAS las páginas de una consulta de Notion (anti-patrón A6 evitado:
 * nunca usar solo `results` y descartar `has_more`/`next_cursor`).
 */
export async function paginate<T>(
  fetchPage: (
    cursor?: string,
  ) => Promise<{ results: T[]; has_more: boolean; next_cursor: string | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    all.push(...page.results);
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return all;
}
