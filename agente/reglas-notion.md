# Reglas Notion (checklist) — evitar los errores del experimento previo

Detalle y ejemplos en `docs/transversal/integracion-notion.md`. Antes de tocar `src/lib/notion/`:

- [ ] **Nada de `as any`/`as any as T`** — usar tipos del SDK + validar con **Zod** al mapear.
- [ ] **No reinventar tipos de Notion** — los tipos propios son **de dominio** (`src/types`), no del shape de Notion.
- [ ] **Paginar SIEMPRE** con `paginate()` — nunca usar solo `results` (bug real: datos truncados).
- [ ] **Rate-limit (~3 rps) + retry/backoff** con `rate-limit.ts` (Notion limita a 3 req/s).
- [ ] **Sin N+1** — no resolver relaciones con `Promise.all` por página; usar lote / espejo Supabase.
- [ ] **Schema registry** (`schema.ts`) — IDs de DB y nombres de columnas en un solo sitio.
- [ ] **Híbrido** — la UI lee de Supabase; el worker sincroniza. Notion no es fuente viva en la UI.
- [ ] **Sin `revalidate`** exportado en `lib/`/servicios (solo aplica a route segments).
- [ ] **Sin hardcodes** (filtros con valores fijos), **sin `console.log`** de respuestas crudas.
- [ ] **Sin secretos/PII** en Notion.
- [ ] **Negocio fuera** de la capa Notion (va en `lib/services`).
- [ ] **Higiene**: nada de backups `*~`, typos de carpeta, ni código experimental commiteado.
