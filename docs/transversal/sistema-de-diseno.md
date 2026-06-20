# T5 · Sistema de diseño

## Base
- **shadcn/ui** (estilo new-york, base slate) + **Tailwind v4** (CSS-first en `globals.css`, `@theme`).
- **Light-only** (uso personal). Sin dark mode por ahora (igual que larissa-esteves-web).
- Iconos: `lucide-react`.

## Tokens
- Variables shadcn (`--background`, `--primary`, …) en `globals.css`.
- Tokens de dominio: `--income` (verde) / `--expense` (rojo) para finanzas; usar siempre estos, no colores sueltos.

## Componentes
- `components/ui` (generados por la CLI de shadcn). No editar a mano salvo restyle controlado.
- Composición sobre props booleanas (patrón compound components cuando crezca).
- Clases condicionales **siempre** con `cn()`.

## Layout
- Shell de dashboard con sidebar (M5). Responsive mobile-first. Densidad cómoda para datos (tablas/gráficas).

## Gráficas
- Evaluar `recharts` o similar cuando se implemente M1 (no añadir dependencia hasta entonces).

## Accesibilidad
- Navegación por teclado, foco visible, contraste AA. Componentes shadcn ya parten de Radix (accesibles).

## Pendiente
- No hay Figma todavía: definir paleta/identidad propias o partir de los tokens shadcn. Decidir al implementar M5.
