# `lib/ai` — IA de runtime (Claude Code headless, suscripción)

La app **encola** tareas IA; el `worker/` las ejecuta invocando **Claude Code headless** con tu
**suscripción** (sin API key). El resto del sistema es agnóstico al motor.

## Archivos (a implementar)
- `jobs/` — helpers para encolar/consultar `ai_jobs` en Supabase (tipo, payload, estado, resultado).
- `runner/` — contrato job↔runner: serializa el prompt + esquema de salida, invoca
  `claude -p --output-format json`, valida el resultado y lo persiste.
- `context/` — recuperación del banco de contexto (M4): filtro por metadatos/keyword (gratis),
  arma el contexto que recibe el agente headless. **Sin embeddings de pago.**

## Reglas
- Nada de `ANTHROPIC_API_KEY` por defecto: la IA de runtime usa la suscripción vía Claude Code.
- Tareas idempotentes y reintentables (estado `pendiente → ejecutando → ok | error`).
- Salida siempre validada con Zod antes de escribir en Supabase/Notion.

Ver `docs/modules/M6-asistente-ia.md` y `docs/modules/M4-banco-contexto.md`.
