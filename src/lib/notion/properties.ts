import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

/**
 * Lectores tipados de propiedades de Notion. Usan la unión discriminada del SDK
 * (cero `as any`). El acceso `page.properties[nombre]` puede ser `undefined`
 * (noUncheckedIndexedAccess), por eso el parámetro es opcional.
 */
export type NotionProp = PageObjectResponse["properties"][string];

export function readTitle(p?: NotionProp): string {
  return p?.type === "title" ? p.title.map((t) => t.plain_text).join("") : "";
}

export function readRichText(p?: NotionProp): string {
  return p?.type === "rich_text" ? p.rich_text.map((t) => t.plain_text).join("") : "";
}

export function readNumber(p?: NotionProp): number | null {
  return p?.type === "number" ? p.number : null;
}

export function readSelect(p?: NotionProp): string | null {
  return p?.type === "select" ? (p.select?.name ?? null) : null;
}

export function readStatus(p?: NotionProp): string | null {
  return p?.type === "status" ? (p.status?.name ?? null) : null;
}

export function readDate(p?: NotionProp): string | null {
  return p?.type === "date" ? (p.date?.start ?? null) : null;
}

export function readFiles(p?: NotionProp): string[] {
  if (p?.type !== "files") return [];
  return p.files
    .map((f) => (f.type === "external" ? f.external.url : f.type === "file" ? f.file.url : null))
    .filter((u): u is string => Boolean(u));
}
