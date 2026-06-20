# 01 · Arquitectura (C4)

## Contexto (C1)
```mermaid
flowchart TB
  user([Usuario - tú])
  subgraph homeos[home-os]
    web[App web Next.js]
    worker[Worker - cron + runner IA]
  end
  notion[(Notion)]
  gmail[(Gmail API)]
  imap[(IMAP - dominio propio)]
  cal[(Google Calendar)]
  events[(Fuentes de eventos)]
  claude[Claude Code headless - suscripción]
  supa[(Supabase - Postgres)]

  user --> web
  web <--> supa
  worker <--> supa
  web <--> notion
  worker <--> notion
  worker <--> gmail
  worker <--> imap
  worker <--> cal
  worker --> events
  worker --> claude
```

## Contenedores (C2)
| Contenedor | Tecnología | Responsabilidad |
|------------|-----------|-----------------|
| **App web** | Next.js 16 (App Router, RSC, Server Actions) | UI del dashboard, lectura desde Supabase, acciones del usuario |
| **Worker** | Node + tsx + node-cron | Sync Notion↔Supabase, polling de correo, descubrimiento de eventos, **runner IA** |
| **Supabase** | Postgres + Auth + RLS | Espejo de Notion, analítica, `ai_jobs`, cuentas de correo (cifradas), auth |
| **Runner IA** | Claude Code headless (`claude -p`) | Ejecuta tareas IA con la **suscripción** (sin API key) |
| **Notion** | API oficial | Superficie de edición / fuente de verdad de registros |

## Componentes de la app (C3)
```mermaid
flowchart LR
  ui[app/ + components/] --> actions[lib/actions - Server Actions + Zod]
  actions --> services[lib/services - dominio]
  services --> notion[lib/notion]
  services --> supa[lib/supabase]
  services --> email[lib/email]
  services --> ai[lib/ai - cola de jobs]
  notion --> notionapi[(Notion API)]
  supa --> db[(Supabase)]
```

## Decisiones clave
- **Separación estricta de capas**: `app` → `actions` → `services` → `lib/*`. La lógica de negocio vive
  en `services`; el acceso a datos en `lib/*`. (Anti-patrón evitado: lógica dentro del CRUD de datos).
- **La app web no llama a la IA directamente**: encola en `ai_jobs`; el worker la procesa (desacople).
- **La UI lee de Supabase** (rápido, sin rate limits); Notion se sincroniza por el worker (híbrido).
