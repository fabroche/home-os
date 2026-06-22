# T6 · Calidad y pruebas

## Herramientas
- **Vitest** + Testing Library (unit/componentes) · **Storybook** (UI aislada, variantes/estados, a11y) ·
  **Playwright** (E2E) · **ESLint** + **Prettier** · `tsc --noEmit`.
- Storybook: **v10** con `@storybook/nextjs-vite` (Next 16 + React 19). Tailwind v4 vía `@tailwindcss/vite`
  en `viteFinal` y `import '../src/app/globals.css'` en `.storybook/preview.tsx`. Scripts: `npm run storybook`,
  `npm run build-storybook`. (No usamos el addon-vitest porque exige Vitest 3/4 y el proyecto va en Vitest 2.)

## Definition of Done (mandatorio)
Un componente/funcionalidad **no está terminado** sin:
1. **Implementación** con el sistema de diseño (tokens, `cn()`, primitivas).
2. **Story** en Storybook cubriendo variantes y estados (co-locada `*.stories.tsx` junto al componente).
3. **Test RTL** de comportamiento (interacción, validación, estados; no solo render).
4. **Baseline Chromatic** para regresión visual — *diferido* hasta congelar el diseño.

Además:
- Lógica de `lib/services` y mappers de `lib/notion` = **tests unitarios** (entrada→salida).
- Flujos críticos (login, conciliación factura→gasto, triaje) = **E2E** Playwright.
- **UX móvil** = cumplir el **DoD móvil** de `mobile-first.md` (mobile-first es obligatorio).
- Lo vigila el subagente `qa-testing`.

### Enforcement automatizado (stories + tests)
`src/components/dod-coverage.test.ts` recorre `src/components/**` y **falla** si un componente
visual no tiene su `*.stories.tsx` **y** su `*.test.tsx|ts` co-locados. Las deudas conocidas viven
en las listas `DEUDA_STORY` / `DEUDA_TEST` del propio test (visibles y trackeadas); al añadir el
artefacto hay que **quitar** el componente de la lista o el test falla. Así un componente nuevo no
puede entrar sin story+test, y la deuda solo puede decrecer. (Lo no visual va en `SIN_STORY_NA` /
`SIN_TEST_NA`.) **Hoy ambas deudas están vacías.**

### Gotchas de Storybook + Next (verificar el render REAL)
`build-storybook` compila pero **no ejecuta el render**: los errores de runtime solo salen en
`npm run storybook` o cargando la story en un navegador. Verificar siempre el render real (p. ej.
Playwright headless contra `iframe.html?id=<id>`). Casos resueltos:
- **Server Actions** (`@/lib/actions/*`) rompen en navegador (`server-guard`) → mocks en
  `.storybook/mocks/` + alias en `main.ts`.
- **`useRouter`/`usePathname`** → `nextjs.appDirectory: true` (global en `preview.tsx`).
- **Componentes mobile-only (`md:hidden`, p. ej. `MobileNav`) no se ven**: la página **Docs**
  (autodocs) renderiza a ancho de escritorio y los oculta; el viewport solo afecta al Canvas.
  Solución: **decorator "marco de móvil"** en la story que revierte `md:hidden`/`fixed` dentro de
  un frame acotado, así se ven en Docs y Canvas.

### DoD de cierre de módulo
Un módulo **no se marca como hecho** sin el checklist de cierre (sección 11 de la plantilla
`_templates/modulo.md`): stories+tests de cada componente, tests de lógica, DoD móvil,
migraciones aplicadas, `typecheck`+`lint`+`test`+`build` verdes (incl. `dod-coverage.test.ts`),
y estado en `CLAUDE.md` actualizado.

## Qué testear con prioridad
| Área | Test clave |
|------|-----------|
| `lib/notion/paginate` | recorre múltiples páginas; no trunca |
| `lib/notion/rate-limit` | respeta 3 rps + retry ante 429 |
| `lib/notion/mappers` | Notion page → DTO válido; rechaza shapes inesperados (Zod) |
| `lib/email` idempotencia | mismo `message_id` no duplica |
| `lib/ai/runner` | salida no conforme → `error` reintentable (no escribe basura) |
| M1 conciliación | match por importe+fecha+proveedor; alta si no hay match |
| M7 RLS | no se leen filas de otro `user_id` |

## Estrategia anti-regresión de la lección Notion
- Test que **falla** si aparece `as any` en `lib/notion` (lint rule) o si un mapper no valida con Zod.
- Test de paginación con fixture de 2+ páginas (el bug A6 del experimento previo).

## CI (sugerido)
`lint` → `typecheck` → `test` → build de imagen. Bloquear merge si algo falla.

## Datos de prueba
- Fixtures de respuestas de Notion/Gmail/IMAP (no llamar a APIs reales en unit tests).
- Entorno de staging con una DB de Notion de juguete antes de tocar tus datos reales.
