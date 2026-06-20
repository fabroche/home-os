# Stack y decisiones (chuleta)

- **Next.js 16** (App Router, RSC, Server Actions) · **React 19** (`ref` prop, no `forwardRef`).
- **TypeScript** estricto (`noUncheckedIndexedAccess`) · alias `@/*`.
- **Tailwind v4** CSS-first (`globals.css @theme`, sin `tailwind.config.js`) · **shadcn/ui** (new-york, slate) · light-only.
- **Supabase** (Postgres + Auth + RLS) — espejo de Notion, analítica, `ai_jobs`, cuentas cifradas.
- **Zod** en todas las fronteras (Server Actions, mappers Notion, salidas IA).
- **date-fns** (no Moment).
- **Notion** vía `@notionhq/client` — modelo híbrido (edición en Notion, lectura desde Supabase).
- **Correo**: Gmail API (`googleapis`) + IMAP (`imapflow`) + `mailparser`; multi-cuenta, credenciales cifradas.
- **IA runtime**: **Claude Code headless** (`claude -p`, suscripción, **sin API key**); cola `ai_jobs` + runner en `worker/`.
- **Deploy**: Hostinger VPS + Dokploy + Docker (`app` + `worker`).

## Capas (dirección de dependencias)
`app/` → `lib/actions` (Zod) → `lib/services` (dominio) → `lib/{notion,supabase,email,ai}` → externas.
La UI **no** importa `lib/notion` directo. La lógica de negocio **no** vive en la capa de datos.

## Env
Siempre desde `src/config/env.ts` (validado, fail-fast). Nunca `process.env.X ?? ""`.
