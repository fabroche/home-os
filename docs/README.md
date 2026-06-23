# Documentación técnica — home-os

Documentación de diseño **previa a la implementación**. Sistema de **gestión personal** (uso single-user):
finanzas, calendario inteligente, backoffice de correo y banco de contexto para IA. Reutiliza la
arquitectura y el método de documentación de `larissa-esteves-web`, añadiendo **Notion** con buenas prácticas.

> **Nivel de detalle:** implementación. Cada módulo define entidades, RF/RNF, diagramas (Mermaid) y
> criterios de aceptación.

> **Estado (2026-06-21): EN PRODUCCIÓN.** App + worker + Supabase desplegados en el VPS (Dokploy).
> Implementado: **T1** (capa Notion, lectura+escritura), **M1** (Finanzas: sync + UI + escritura a Notion),
> **M4** (banco de contexto), **M7** (auth single-user), **T5** (sistema de diseño + Storybook). Ver
> `CLAUDE.md` → "Estado actual". Siguiente por dependencias: **M6** (asistente IA).

## Organización (híbrido en 2 niveles)
- **GLOBAL** (`00-overview/`) — visión, arquitectura C4, **ER global** canónico, mapa de casos de uso, convenciones.
- **MÓDULO** (`modules/`) — un documento por módulo, con una sección por funcionalidad.
- **TRANSVERSAL** (`transversal/`) — integraciones (Notion, correo, Calendar), infra/DevOps, diseño, **mobile-first**, calidad, **generador de documentos PDF**.

```
docs/
  README.md
  00-overview/{00-vision-y-alcance,01-arquitectura-c4,02-modelo-datos-global,03-mapa-casos-de-uso,04-convenciones}.md
  modules/{M1-finanzas,M2-calendario-inteligente,M3-backoffice-correo,M4-banco-contexto,M5-dashboard,M6-asistente-ia,M7-auth-seguridad}.md
  transversal/{integracion-notion,integracion-correo,integracion-calendar,infra-devops,sistema-de-diseno,mobile-first,calidad-y-pruebas,generador-documentos-pdf}.md
  _templates/{modulo,funcionalidad}.md
```

## Mapa de módulos
| ID | Módulo | Estado |
|----|--------|:------:|
| M1 | Finanzas (Notion + facturas del correo) | 🟩 implementado (prod) |
| M2 | Calendario inteligente | 🟧 borrador |
| M3 | Backoffice / triaje de correo | 🟧 borrador |
| M4 | Banco de contexto (IA) | 🟩 implementado |
| M5 | Dashboard | 🟧 borrador |
| M6 | Asistente IA / orquestación (jobs headless) | 🟧 borrador |
| M7 | Auth & seguridad (single-user) | 🟩 implementado |
| T1 | Integración Notion (best-practices) | 🟩 implementado |
| T2 | Integración correo (Gmail + IMAP) | 🟧 borrador |
| T3 | Integración Calendar / eventos | 🟧 borrador |
| T4 | Infra & DevOps (Hostinger/Dokploy/Docker) | 🟩 implementado (prod) |
| T5 | Sistema de diseño (+ Storybook) | 🟩 implementado |
| T6 | Calidad y pruebas (Vitest/RTL + Storybook) | 🟨 en progreso |

## Ledger de decisiones de arquitectura
| # | Decisión | Detalle |
|---|----------|---------|
| D1 | Stack = Next.js 16 · React 19 · TS · Tailwind v4 · shadcn · Supabase | Igual que larissa-esteves-web. |
| D2 | **Monolingüe (español)** | Sin next-intl ni `[locale]` (uso personal). |
| D3 | **Notion híbrido** | Notion = edición/fuente de verdad de registros; Supabase = espejo para histórico/analítica/consulta rápida. |
| D4 | **Capa Notion aislada** | `client/schema/paginate/rate-limit/mappers/sync`; la UI nunca ve el shape de Notion. |
| D5 | **Correo multi-cuenta** | Gmail API (OAuth) + IMAP; credenciales cifradas en Supabase. |
| D6 | **IA de runtime = Claude Code headless** | Suscripción, **sin API key**. Cola `ai_jobs` + runner en el worker. |
| D7 | **Banco de contexto sin embeddings de pago** | Recuperación por metadatos/keyword; el agente headless razona sobre el texto. Embeddings locales opcionales a futuro. |
| D8 | **Single-user** | Supabase Auth (magic link) + RLS por `user_id`. |
| D9 | **Worker separado** | Cron + runner IA en contenedor propio (`worker.Dockerfile`). |
| D10 | Deploy = **Hostinger VPS + Dokploy + Docker** | `docker-compose` (app + worker). |
| D11 | Diagramas en **Mermaid** | Embebidos, versionables por PR. |
| D12 | **date-fns** (no Moment) | Lección del proyecto `platzi-my-store`. |
| D13 | **Finanzas = `movimiento` + `deuda`** | Una sola tabla `Presupuesto` en Notion (ingresos+gastos por `type`, importes firmados) + `Deudas_Personales`. `flujo` derivado. |
| D14 | **Notion con fetch nativo (undici)** | El `node-fetch@2` del SDK da "Premature close" vs Cloudflare desde el VPS; se inyecta `fetch` nativo. |
| D15 | **Auth login/logout en cliente** | Server Action no propagaba la cookie a tiempo tras Traefik/HTTPS; el browser client la escribe + recarga completa. Middleware fail-closed. |
| D16 | **Imágenes Docker** | app = `Dockerfile` (Next standalone, requiere `public/`); worker = `worker.Dockerfile` (`npm ci --omit=dev`, `tsx`). `NEXT_PUBLIC_*` deben estar en el build (Dokploy las da vía `.env`). |

## Estados de documento
`⬜ pendiente` → `🟧 borrador` → `🟨 en revisión` → `🟩 aprobado`
