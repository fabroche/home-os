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
- Lo vigila el subagente `qa-testing`.

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
