# CLAUDE.md — home-os

## Qué es este repositorio
Sistema de **gestión personal** (uso single-user): **finanzas** (Notion + facturas del correo),
**calendario inteligente** (viajes/eventos + avisos de eventos locales o remotos de interés),
**backoffice** (triaje de varias cuentas de correo) y un **banco de contexto** para la IA.

Stack: **Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase · Zod · Notion**.
Monolingüe (español). Reutiliza la arquitectura y el método de documentación de `larissa-esteves-web`.

## Comandos
```powershell
npm run dev        # dev server (Turbopack)
npm run build      # build de producción (standalone)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
npm run test:e2e   # Playwright
npm run worker     # worker local (cron + runner IA)
```

## Arquitectura clave
- **Capas** (dirección única): `app/` → `lib/actions` (Zod) → `lib/services` (dominio) → `lib/{notion,supabase,email,ai}` → APIs externas. La UI **no** importa `lib/notion` directo; el negocio **no** vive en la capa de datos.
- **`src/config/env.ts`** — validación de env con Zod (fail-fast). Leer env SIEMPRE de aquí.
- **`src/lib/notion/`** — capa Notion aislada (client, schema registry, paginate, rate-limit, mappers, sync). Modelo **híbrido**: se edita en Notion, la UI lee de **Supabase**.
- **`worker/`** — proceso aparte: cron (sync, polling correo, eventos, recordatorios) + **runner IA**.
- **`src/app/globals.css`** — Tailwind v4 `@theme` (sin `tailwind.config.js`). Light-only.

## IA de runtime (importante)
La IA dentro de la app usa **Claude Code headless con la suscripción** (`claude -p`), **sin API key**.
La app encola tareas en `ai_jobs` (Supabase) y el `worker` las drena con el runner. El sistema es
**agnóstico al motor**: migrar a `ANTHROPIC_API_KEY` sería cambiar solo el runner. El banco de contexto
**no usa embeddings de pago** (recuperación por metadatos/keyword + FTS de Postgres).

## Reglas transversales
- **React 19**: `ref` es prop normal (no `forwardRef`).
- **Server Actions**: `'use server'` + Zod en `src/lib/actions/`.
- **`cn()`** (`src/lib/utils.ts`) para clases condicionales, siempre.
- **Tailwind v4**: nunca `tailwind.config.js`; tokens en `globals.css @theme`.
- **Notion**: cero `as any`, paginar siempre, rate-limit+retry, schema registry. Ver `agente/reglas-notion.md`.
- **date-fns** (no Moment). Credenciales de cuentas **cifradas** en Supabase (nunca en `.env` ni en texto plano).

## Documentación y subagentes
- Especificaciones técnicas completas en **`docs/`** (overview + módulos M1–M7 + transversales). Empezar por `docs/README.md`.
- Banco de contexto del dev en **`agente/`**.
- Subagentes en **`.claude/agents/`**: `frontend`, `backend`, `devops`, `backoffice`, `notion-integration`, `finanzas-data`, `qa-testing`, `ai-agente`.

## Módulos
| ID | Módulo |
|----|--------|
| M1 | Finanzas (Notion + facturas) |
| M2 | Calendario inteligente |
| M3 | Backoffice / triaje de correo |
| M4 | Banco de contexto |
| M5 | Dashboard |
| M6 | Asistente IA (jobs headless) |
| M7 | Auth & seguridad (single-user) |

## Estado actual
Scaffold + documentación + subagentes (sin código de features). Siguiente: implementar por módulo,
empezando por T1 (capa Notion) + M1 (Finanzas), tras mapear el schema real de tus DBs de Notion.

## Setup
1. `cp .env.example .env.local` y rellenar (Supabase, Notion, Google OAuth, IMAP, CRON_SECRET, cifrado).
2. `npm install`.
3. `npm run dev`.

## Deploy
Hostinger VPS + Dokploy + Docker (`docker-compose.yml`: `app` + `worker`). Ver `docs/transversal/infra-devops.md`.
Nota: el runner IA headless requiere Claude Code autenticado donde corra el worker (o correrlo en local).
