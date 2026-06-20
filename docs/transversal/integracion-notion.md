# T1 · Integración Notion (capa + ADR de buenas prácticas)

Notion es la pieza central de datos. Esta integración se diseña **a partir de los errores reales** del
experimento previo (`genzai-cms-nextjs-notion-odoo`). Modelo **híbrido** (D3): se **edita en Notion**,
se **espeja en Supabase** para analítica/consulta rápida; la UI lee de Supabase.

## Anti-patrones detectados → reglas

| # | Anti-patrón (código real previo) | Regla en home-os |
|---|----------------------------------|------------------|
| A1 | Filtro hardcodeado `title.equals: "Frank"` dejado en producción | Cero valores/experimentos hardcodeados; revisión + lint |
| A2 | `console.log(response.results[0].properties.Tareas.relation)` (y peta si `results` está vacío) | Sin logs crudos; acceso defensivo; nunca `[0]` sin comprobar |
| A3 | `export const revalidate = process.env.CACHE_MAX_AGE ?? 5` en `libs/` y servicios | `revalidate` solo en route segments; caché explícita y donde corresponde |
| A4 | `as any as NotionPersonaPage` por todos lados | **Prohibido** `as any`. Tipos del SDK + validación Zod |
| A5 | ~300 líneas de tipos Notion a mano que duplican el SDK y se desincronizan | Usar `@notionhq/client` (`PageObjectResponse`, etc.); nuestros tipos son **de dominio** |
| A6 | `getDatabase` ignora `has_more`/`next_cursor` → datos truncados en silencio | Helper `paginate()` que recorre **todo** |
| A7 | Sin rate-limit ni retry (Notion = 3 req/s) | Cola `p-queue` (~3 rps) + retry con backoff |
| A8 | `getPagesByIds` + `expandPersonaRelations` → **N+1** masivo | Resolver relaciones en lote / desde el espejo Supabase |
| A9 | Notion como fuente viva sin caché durable (solo React `cache()`) | **Híbrido**: la UI lee de Supabase; sync por el worker |
| A10 | Acceso por strings (`props.nombre`, `props.Birthdate`…) acoplado a nombres de columna | **Schema registry**: nombres/tipos en un sitio; renombrar = un cambio |
| A11 | `password` en texto plano en Notion y traído a la app | Sin secretos/PII sensibles en Notion |
| A12 | Lógica de negocio (`getFullName`, `formatDate`) dentro del servicio CRUD | Negocio en `lib/services`; aquí solo acceso/mapeo |
| A13 | Backup `*.service.ts~`, carpeta `componets` (typo), mojibake | Higiene de repo; sin basura commiteada |

## Arquitectura de la capa (`src/lib/notion/`)

```
client.ts        # singleton, fail-fast si falta token
schema.ts        # registry: DB IDs + propiedades tipadas (fuente única)
paginate.ts      # recorre todas las páginas
rate-limit.ts    # p-queue ~3rps + retry/backoff
mappers/         # Notion page -> DTO de dominio (Zod)
sync/            # Notion -> Supabase (incremental por cursor)
```

### `client.ts` — fail-fast (corrige A4/A11)
```ts
import "server-only";
import { Client } from "@notionhq/client";
import { requireEnv } from "@/config/env";

export const notion = new Client({ auth: requireEnv("NOTION_API_KEY") });
// Nada de `auth: secret ?? ""` (construir un cliente inválido que falla en runtime).
```

### `schema.ts` — registry (corrige A10)
```ts
// Único lugar donde viven IDs de DB y nombres/tipos de columnas.
export const DB = {
  gastos:   { id: requireEnv("NOTION_DB_GASTOS_ID"),   props: { fecha: "Fecha", importe: "Importe", categoria: "Categoría" } },
  ingresos: { id: requireEnv("NOTION_DB_INGRESOS_ID"), props: { /* ... */ } },
} as const;
```

### `paginate.ts` — sin truncado (corrige A6)
```ts
export async function paginate<T>(
  fetchPage: (cursor?: string) => Promise<{ results: T[]; has_more: boolean; next_cursor: string | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    all.push(...page.results);
    cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
  } while (cursor);
  return all;
}
```

### `rate-limit.ts` — 3 rps + retry (corrige A7)
```ts
import PQueue from "p-queue";
const queue = new PQueue({ intervalCap: 3, interval: 1000 }); // 3 req/s
export function nq<T>(fn: () => Promise<T>): Promise<T> {
  return queue.add(() => withRetry(fn)) as Promise<T>;
}
// withRetry: reintentos con backoff ante 429/5xx (respetando Retry-After).
```

### `mappers/` — Notion → dominio con Zod (corrige A4/A5/A12)
```ts
// El resto de la app SOLO ve `Gasto` (src/types), nunca el shape de Notion.
export function toGasto(page: PageObjectResponse): Gasto {
  const p = page.properties;
  return GastoSchema.parse({
    notion_page_id: page.id,
    fecha: readDate(p[DB.gastos.props.fecha]),
    importe: readNumber(p[DB.gastos.props.importe]),
    // ...
  });
}
```

## Sync híbrido (D3/D9)
- Worker job `sync<DB>`: query incremental (filtro por `last_edited_time` ≥ cursor de `SYNC_STATE`),
  paginado y rate-limited → `mapper` → **upsert** en Supabase por `notion_page_id`.
- **Webhooks de Notion** (`/api/webhooks/notion`): verificar firma (`NOTION_WEBHOOK_SECRET`), encolar y
  dejar que el worker sincronice (respuesta 200 rápida).
- Escritura del usuario (home-os → Notion): solo campos acordados, vía `actions` → `lib/notion`, y
  re-sync para confirmar.

## Notas de SDK
- Versión del SDK / API de Notion: confirmar la que soporta **data sources** (el experimento usaba
  `dataSources.query` / `data_source_id`). Fijar la versión y el `Notion-Version` header.
- Inspeccionar las DBs reales (vía **MCP de Notion** en dev) para poblar `schema.ts` con exactitud.
