# T6 · Calidad y pruebas

## Herramientas
- **Vitest** + Testing Library (unit/componentes) · **Playwright** (E2E) · **ESLint** + **Prettier** · `tsc --noEmit`.

## Definition of Done
- Componente no trivial = implementación + **test RTL**.
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
