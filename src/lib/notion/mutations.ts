import "@/lib/server-guard";
import type {
  CreatePageParameters,
  UpdatePageParameters,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { notion } from "./client";
import { nq } from "./rate-limit";
import type { NotionPropValue } from "./properties-write";

// Las propiedades se construyen con los writers (valores válidos del SDK). El record
// se castea al tipo concreto del SDK en la llamada (la firma de índice del SDK es más
// estricta que la unión); es un cast tipado, sin `any`.
type Props = Record<string, NotionPropValue>;

/**
 * Escritura en Notion (rate-limited). Notion es la fuente de verdad del modelo
 * híbrido: la app escribe aquí y luego refresca el espejo de Supabase.
 */

/** Actualiza propiedades de una página existente. */
export async function updatePageProps(pageId: string, properties: Props): Promise<void> {
  await nq(() =>
    notion.pages.update({ page_id: pageId, properties } as UpdatePageParameters),
  );
}

/** Crea una página en una DB y devuelve la página creada (completa). */
export async function createPageInDb(
  databaseId: string,
  properties: Props,
): Promise<PageObjectResponse> {
  const page = await nq(() =>
    notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    } as CreatePageParameters),
  );
  return page as PageObjectResponse;
}

/**
 * Archiva una página (la manda a la papelera de Notion). Es el "borrado" del modelo
 * híbrido: reversible desde Notion y, al desaparecer de las queries, el sync deja de
 * traerla. La query de la DB no devuelve archivadas, así no reaparece.
 */
export async function archivePage(pageId: string): Promise<void> {
  await nq(() => notion.pages.update({ page_id: pageId, archived: true } as UpdatePageParameters));
}

/** Recupera una página por id (para re-sincronizar tras escribir). */
export async function retrievePage(pageId: string): Promise<PageObjectResponse> {
  const page = await nq(() => notion.pages.retrieve({ page_id: pageId }));
  if (!("properties" in page)) {
    throw new Error(`retrievePage: página parcial sin propiedades (${pageId})`);
  }
  return page;
}
