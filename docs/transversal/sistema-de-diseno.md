# T5 · Sistema de diseño

Identidad **editorial con personalidad** (inspirada en la dirección de Awake Agency,
adaptada a un dashboard de datos legible). Definida íntegramente en `src/app/globals.css`
(Tailwind v4 CSS-first, **sin** `tailwind.config.js`).

## Base
- **Tailwind v4** (`@theme inline` en `globals.css`) + utilidades shadcn (estilo new-york).
- **Light + Dark** vía `next-themes` (`attribute="class"` → `.dark` en `<html>`).
  El provider está en `src/components/theme/theme-provider.tsx`, el toggle en `theme-toggle.tsx`.
- Iconos: `lucide-react`.

## Tipografía
- **Inter Tight** (`--font-inter`) — cuerpo, datos y titulares. `next/font/google` en `layout.tsx`.
- **Instrument Serif** (`--font-instrument`) — solo acentos en *cursiva* dentro de titulares.
  Usar la utilidad **`.serif-accent`** (serif + italic + weight 400) sobre la palabra a destacar.
- Titulares: sans, `font-weight 600`, `tracking` ceñido (estilos base de `h1..h4` en `globals.css`).

## Color
- **Marca: violeta eléctrico `#4928fd`** (`--primary` / `--brand`); en dark se aclara a `#6a4bff`.
- Tokens semánticos de dominio: `--income` (verde), `--expense` (rojo), `--debt` (ámbar).
  Usar **siempre** estos (`text-income`, `bg-debt`, …), nunca colores sueltos.
- Paleta lúdica decorativa: `--iris`, `--azure`, `--tangerine`, `--lime`, `--blush`.
- Gradientes suaves: `--glow-cool` / `--glow-warm` (con variantes dark).

## Formas y efectos
- **Botones pill** (`rounded-full`) con inversión al hover y flecha animada (`<Button arrow>`).
- **Cards** `rounded-xl` con `shadow-soft`; `<Card hover>` añade elevación sutil.
- **Blob de gradiente** de fondo: utilidad **`.glow-bg`** (div absoluto, `aria-hidden`).
- **Header** flotante tipo pill que se vuelve sticky con `backdrop-blur` al hacer scroll;
  resalta el enlace activo (`dashboard-header.tsx`).

## Motion (discreto)
- **`<Reveal>`** (`src/components/motion/reveal.tsx`) — fade + slide-up al entrar en viewport
  (`motion`), respeta `prefers-reduced-motion`. `delay` para escalonar.
- **`<AnimatedNumber>`** (`count-up.tsx`) — conteo ascendente para KPIs (`react-countup`),
  con formato de divisa (`currency="EUR"`).

## Componentes del sistema
`src/components/ui`: `button`, `card`, `badge`, `count-up`.
`src/components/theme`: `theme-provider`, `theme-toggle`.
`src/components/motion`: `reveal`.
`src/components/layout`: `dashboard-header`, `logout-button`, `module-stub`.
- Clases condicionales **siempre** con `cn()`. Variantes con `class-variance-authority`.

## Dependencias añadidas
`motion`, `next-themes`, `react-countup`.

## Storybook (DoD)
- **Storybook v10** con `@storybook/nextjs-vite` (compatible con Next 16 + React 19).
- **Tailwind v4** vía `@tailwindcss/vite` en `viteFinal` (`.storybook/main.ts`) + `import '../src/app/globals.css'`
  en `.storybook/preview.tsx`. Addons: `addon-a11y`, `addon-docs`.
- **NO** usamos `@storybook/addon-vitest` (stories-como-tests en navegador): exige Vitest 3/4 y el proyecto
  va en **Vitest 2**. Los tests de comportamiento se cubren con **RTL** co-locados (`*.test.tsx`).
- Stories **co-locadas** junto al componente (`*.stories.tsx`), formato **CSF3** (`satisfies Meta<typeof X>`).
  Hay stories de las primitivas: `Button`, `Card`, `Badge`, `Input/Textarea/Select/Field`, `ThemeToggle`, `BarList`.
- Comandos: `npm run storybook` (dev, :6006) · `npm run build-storybook`.
- **Toggle de tema** (Light/Dark) en la toolbar (`.storybook/preview.tsx`, decorator manual sin addon):
  aplica `.dark` al canvas para revisar cada componente en ambos temas.
- **Chromatic** (regresión visual): diferido hasta congelar el diseño.

### Definition of Done de un componente
1. Implementación con tokens/primitivas + `cn()`.
2. **Story** cubriendo variantes y estados.
3. **Test RTL** de comportamiento (no solo render).
4. (Diferido) baseline Chromatic.

## Accesibilidad
- Navegación por teclado, foco visible (`focus-visible:ring-ring`), contraste AA en ambos temas.
- Motion respeta `prefers-reduced-motion`; el toggle de tema evita mismatch de hidratación.

## Pendiente / futuro
- Gráficas: evaluar `recharts` cuando lo pida M1/M5 (no añadir hasta entonces).
- Migrar tablas a un componente `Table` reutilizable si crecen los listados.
