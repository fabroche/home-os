# `lib/notion` — capa de acceso a Notion (hecha bien)

Aislada del resto de la app. La UI y los servicios **nunca** ven el shape crudo de Notion.

## Archivos (a implementar)
- `client.ts` — singleton de `@notionhq/client`, **fail-fast** si falta el token (nada de `?? ""`).
- `schema.ts` — **schema registry**: IDs de DB + definición tipada de propiedades en un solo sitio.
  Renombrar una columna en Notion = un cambio aquí.
- `paginate.ts` — helper genérico que recorre **todas** las páginas (`has_more`/`next_cursor`).
- `rate-limit.ts` — cola (`p-queue`, ~3 req/s) + retry con backoff (Notion limita a 3 rps).
- `mappers/` — un mapper por DB: página de Notion → **DTO de dominio** (`src/types`). Validación Zod.
- `sync/` — sincronización híbrida Notion → Supabase (espejo para analítica/consultas rápidas).

## Reglas (anti-patrones del experimento previo `genzai-cms-nextjs-notion-odoo`)
1. **Nunca** `as any as T`. Usar tipos oficiales del SDK y validar con Zod al mapear.
2. **Siempre** paginar. Nada de leer solo `results` y descartar el cursor.
3. **Siempre** pasar por el rate-limiter + retry.
4. Nada de filtros/valores hardcodeados ni `console.log` de respuestas crudas.
5. Sin `export const revalidate` en archivos de `lib/` (solo aplica a route segments).
6. Sin secretos/PII en Notion. Acceso a propiedades vía el schema registry, no por strings sueltos.
7. Lógica de negocio fuera de aquí (va en `lib/services`).

Ver `docs/transversal/integracion-notion.md`.
