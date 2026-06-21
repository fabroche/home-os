import type { UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";

/**
 * Escritores de propiedades de Notion (inverso de los `readXxx` de properties.ts).
 * Construyen el payload que espera la API para `pages.create` / `pages.update`.
 * Cero `as any`: tipados contra el record de propiedades de Notion (no la unión por
 * tipo de parent de CreatePageParameters).
 */
export type NotionPropValue = NonNullable<UpdatePageParameters["properties"]>[string];
type PropValue = NotionPropValue;

export function writeTitle(text: string): PropValue {
  return { title: [{ type: "text", text: { content: text } }] };
}

export function writeNumber(n: number | null): PropValue {
  return { number: n };
}

export function writeSelect(name: string | null): PropValue {
  return { select: name ? { name } : null };
}

export function writeStatus(name: string): PropValue {
  return { status: { name } };
}

export function writeDate(iso: string | null): PropValue {
  return { date: iso ? { start: iso } : null };
}

/** Propiedad `files` como enlaces externos (URL pública de Supabase Storage). */
export function writeFiles(urls: { url: string; name?: string }[]): PropValue {
  return {
    files: urls.map(({ url, name }) => ({
      type: "external",
      name: name ?? url.split("/").pop() ?? "archivo",
      external: { url },
    })),
  };
}
