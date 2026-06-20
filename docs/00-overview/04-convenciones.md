# 04 · Convenciones

## Código
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`). Nada de `any` (lint en `warn`, tratar como error en revisión).
- **Alias** `@/*` → `src/*`.
- **React 19**: `ref` es prop normal (no `forwardRef`). Server Components por defecto; `"use client"` solo cuando haga falta.
- **Server Actions**: `'use server'` + validación **Zod** de la entrada, en `src/lib/actions/`.
- **`cn()`** (`src/lib/utils.ts`) para clases condicionales, siempre.
- **Tailwind v4**: tokens en `globals.css` bajo `@theme`. **No** crear `tailwind.config.js`.
- **Fechas**: `date-fns` (nunca Moment).
- **Env**: leer SIEMPRE desde `src/config/env.ts` (validado), nunca `process.env.X ?? ""` suelto.

## Capas (dirección de dependencias)
`app/` → `lib/actions` → `lib/services` → `lib/{notion,supabase,email,ai}` → APIs externas.
Nunca al revés. La UI no importa `lib/notion` directamente.

## Notion (reglas duras — ver `transversal/integracion-notion.md`)
- Tipos oficiales del SDK + validación Zod al mapear. Cero `as any as T`.
- Paginación siempre; rate-limit + retry siempre; schema registry para IDs y propiedades.

## Nomenclatura
- Archivos de componentes: `kebab-case.tsx`; componentes: `PascalCase`.
- Módulos en docs: `Mx-nombre.md`; IDs estables `RF-Mx-001`, `F-Mx-N`.
- Tablas Supabase: `snake_case`, en español (coherente con el dominio).

## Git
- Rama por trabajo + PR. Commits convencionales (`feat:`, `fix:`, `docs:`, `chore:`).
- Nada experimental ni backups (`*~`) ni `console.log` crudos en commits.

## Definition of Done (UI)
Componente no trivial = implementación + **test (RTL/Vitest)**. E2E críticos con Playwright. Lo vigila `qa-testing`.

## Seguridad
- Single-user + RLS por `user_id`. Credenciales de cuentas **cifradas** en Supabase (AES-256-GCM).
- Nada de secretos en Notion ni en el repo. `.env*` siempre ignorado.
