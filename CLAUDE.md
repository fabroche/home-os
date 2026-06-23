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
npm run test       # Vitest (unit + RTL de componentes)
npm run test:e2e   # Playwright
npm run storybook       # Storybook dev (:6006) — UI aislada, variantes/estados, a11y
npm run build-storybook # build estático de Storybook
npm run worker     # worker local (cron de sync)
npm run inspect:notion   # introspección read-only de una DB de Notion
npm run sync:finanzas    # sync manual Notion→Supabase (el worker lo hace por cron)
```

## Arquitectura clave
- **Capas** (dirección única): `app/` → `lib/actions` (Zod) → `lib/services` (dominio) → `lib/{notion,supabase,email,ai}` → APIs externas. La UI **no** importa `lib/notion` directo; el negocio **no** vive en la capa de datos.
- **`src/config/env.ts`** — validación de env con Zod (fail-fast). Leer env SIEMPRE de aquí.
- **`src/lib/notion/`** — capa Notion aislada (client, schema registry, paginate, rate-limit, mappers, sync). Modelo **híbrido**: se edita en Notion, la UI lee de **Supabase**.
- **`worker/`** — proceso aparte: cron (sync, polling correo, eventos, recordatorios) + **runner IA**.
- **`src/app/globals.css`** — Tailwind v4 `@theme` (sin `tailwind.config.js`). **Sistema de diseño** editorial:
  Inter Tight + Instrument Serif italic, marca violeta `#4928fd`, light+dark (`next-themes`), motion discreto.
  Ver `docs/transversal/sistema-de-diseno.md`. Componentes en `src/components/{ui,theme,motion,layout}`.

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
- **Mobile-first (OBLIGATORIO)**: la base de estilos es la vista móvil; se escala con `sm:`/`md:`/`lg:`.
  Ningún módulo se siente "desktop encogido". Patrones y DoD móvil en `docs/transversal/mobile-first.md`.
- **Notion**: cero `as any`, paginar siempre, rate-limit+retry, schema registry. Ver `agente/reglas-notion.md`.
- **date-fns** (no Moment). Credenciales de cuentas **cifradas** en Supabase (nunca en `.env` ni en texto plano).

## Documentación y subagentes
- Especificaciones técnicas completas en **`docs/`** (overview + módulos M1–M7 + transversales). Empezar por `docs/README.md`.
- Banco de contexto del dev en **`agente/`**.
- Subagentes en **`.claude/agents/`**: `frontend`, `backend`, `devops`, `backoffice`, `calendario`, `notion-integration`, `finanzas-data`, `qa-testing`, `ai-agente`.

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

## Estado actual (2026-06-23) — EN PRODUCCIÓN
Desplegado en Dokploy (VPS): **app web** (`homeos.genzai.cloud`, con login) + **worker** (sync 24/7) +
**Supabase** self-host (`homeos-supabase.genzai.cloud`). Repo: `github.com/fabroche/home-os`. 183 tests verdes.

**Implementado:**
- **T1 · Capa Notion** (`src/lib/notion/`): client (fetch nativo undici — el `node-fetch@2` del SDK fallaba
  con "Premature close" vs Cloudflare), schema registry, paginación, rate-limit+retry, mappers Zod, sync.
  **Escritura** (`mutations.ts` + `properties-write.ts`): `updatePageProps`/`createPageInDb`/`retrievePage`.
- **M1 · Finanzas**: sync Notion→Supabase (worker/cron) de `Presupuesto`→`movimiento` y `Deudas_Personales`→`deuda`;
  la UI lee de Supabase; KPIs, gastos por categoría, resumen mensual y deudas. **Escritura a Notion** (modelo
  híbrido): editar `status` (Pendiente/Pagado), alta de gastos/deudas con firma de importe, subida de
  **factura/comprobante** a Storage público + enlace en Notion, y **sync manual** desde la UI. Deudas = saldo
  neto por persona (pendiente vs por cobrar). El sync propaga **borrados** de Notion vía soft-delete
  (mark-and-sweep `deleted_at`; la UI lee solo activos). Migraciones `0001`/`0003`/`0004`.
  **UX móvil:** tablas → tarjetas apiladas (`.reflow-cards` + `data-label`), tipografía fluida y touch
  targets ≥44px (mobile-first).
- **M7 · Auth**: email+contraseña single-user; login/logout **en cliente** (cookie fiable tras Traefik);
  `src/proxy.ts` (middleware Next 16) protege rutas (fail-closed). Usuario en Supabase, sin SMTP aún.
- **M4 · Banco de contexto**: CRUD de entradas tipadas (tags + vigencia + estado) y recuperación selectiva
  por tipo/tag/vigencia + FTS Postgres (sin embeddings, D7). Migración `0002_contexto.sql` **aplicada**
  (incluye la función SQL `recuperar_contexto`). UI en `/contexto`.
- **M6 · Asistente IA (MVP)**: cola `ai_jobs` (claim atómico `tomar_ai_job` con SKIP LOCKED) + **runner
  headless** (`claude -p --output-format json`, contexto M4 + **snapshot financiero**, **salida validada con
  Zod**, reintentos con backoff). **Burbuja de chat** (FAB + sheet móvil/tarjeta desktop, polling,
  **historial en sessionStorage**, animaciones motion — el panel **crece/se recoge desde el FAB** y el
  **polling persiste el `jobId` y se reanuda** al reabrir/recargar, así no se pierde la respuesta de un
  job lento) sobre `consulta_rag`, y **proponer contexto**
  (`proponer_contexto` → `SuggestionCard` con Revisar y publicar / Guardar borrador / Descartar).
  **Gobernanza M4↔M6:** decide solo con publicado, escribe solo borradores, publicar = usuario.
  Migraciones `0005`/`0006`. Auth runner por `CLAUDE_CODE_OAUTH_TOKEN` (CLI fijado en la imagen del worker).
  Engine-agnóstico (deps inyectables). **Pendiente (Fase 5):** rotación de token in-app cifrada + banner de
  estado; observabilidad de jobs en dashboard; intención por clasificación del modelo (hoy heurística).
- **T5 · Sistema de diseño**: identidad editorial (Inter Tight + Instrument Serif italic, marca violeta
  `#4928fd`, light+dark con next-themes, motion discreto). Primitivas en `src/components/{ui,theme,motion}`.
  Header persistente (grupo `(dashboard)`) + **loading skeletons a medida**. **Storybook 10** (stories + a11y +
  toggle de tema). **Navegación mobile-first:** bottom tab bar en móvil (`mobile-nav.tsx`, fuente única
  `nav-items.tsx`) + nav-píldora en desktop. Ver `docs/transversal/sistema-de-diseno.md` y
  `docs/transversal/mobile-first.md`.

Los prerequisitos manuales de la escritura M1 (capacidades Insert/Update en Notion, columna `comprobante`,
`NOTION_API_KEY` en la app, migración `0003`) están **completados** y la escritura funciona en prod.

**Roadmap:** **M6 MVP ✓** (falta Fase 5: rotación token in-app + observabilidad); SMTP/correo + DNS;
luego **M3** (correo) y **M2** (calendario); **M5** (dashboard). Orden por dependencias: M4✓ → M6✓(MVP) → M3/M2 → M5.
**Backlog M1 (sugerencias):** filtro por mes/rango de fechas y exportar CSV en movimientos; conciliación
factura↔gasto (M3/M6). Ver `docs/modules/M1-finanzas.md`.

**Deploy:** ver `docs/transversal/infra-devops.md`. Gotchas resueltos documentados en la memoria del proyecto.

## Setup
1. `cp .env.example .env.local` y rellenar (Supabase, Notion, Google OAuth, IMAP, CRON_SECRET, cifrado).
2. `npm install`.
3. `npm run dev`.

## Deploy
Hostinger VPS + Dokploy + Docker (`docker-compose.yml`: `app` + `worker`). Ver `docs/transversal/infra-devops.md`.
Nota: el runner IA headless requiere Claude Code autenticado donde corra el worker (o correrlo en local).
