# Mobile-first · Adaptabilidad y UX móvil

Norma **transversal y obligatoria** para todos los módulos (M1–M7). Complementa
el sistema de diseño (`docs/transversal/sistema-de-diseno.md`): este documento es
*cómo* cada pantalla debe sentirse en móvil, no solo *verse*.

> **Principio.** home-os es de uso personal y se consume tanto en escritorio como
> en el teléfono. Diseñamos **mobile-first**: la base de estilos es la vista móvil
> y se *escala hacia arriba* con breakpoints (`sm:`, `md:`, `lg:`). Nunca al revés
> (no diseñamos desktop y luego "encogemos"). Ningún módulo se considera terminado
> si en el teléfono se siente como un escritorio comprimido.

## Breakpoints (Tailwind v4, defaults)
| Prefijo | Ancho min | Uso típico |
|---------|-----------|------------|
| *(base)* | 0 | **Móvil. Es el punto de partida de toda clase.** |
| `sm:` | 40rem (640px) | móvil grande / tablet vertical |
| `md:` | 48rem (768px) | tablet / desktop pequeño — **corte nav y tablas** |
| `lg:` | 64rem (1024px) | desktop |

Regla práctica: escribe primero la versión móvil sin prefijo y añade `sm:`/`md:`/`lg:`
solo para *agrandar* o *reorganizar* en pantallas mayores.

## Patrones obligatorios del proyecto

### 1. Navegación
- **Móvil:** bottom tab bar fija al viewport (`src/components/layout/mobile-nav.tsx`),
  al alcance del pulgar, con icono + etiqueta y estado activo en violeta.
- **Desktop:** nav-píldora del header (`dashboard-header.tsx`).
- **Fuente única** de secciones: `src/components/layout/nav-items.tsx` (href + label +
  icono). Header y bottom bar la consumen; nunca duplicar la lista.
- El layout reserva padding inferior en móvil = alto de la barra + `safe-area-inset-bottom`.
- **Evolución:** con **>5 secciones** la bottom bar se queda corta → migrar al menú
  hamburguesa/drawer (cambio localizado gracias a `nav-items.tsx`).

### 2. Tablas densas → tarjetas apiladas
Una tabla de >3–4 columnas es ilegible encogida. Usar la utilidad **`.reflow-cards`**
(`globals.css`): debajo de `md` la tabla se refluye a tarjetas apiladas, una por fila,
con cada celda etiquetada por su `data-label`.
```html
<table class="reflow-cards w-full text-sm">
  …
  <td data-label="Importe">…</td>   <!-- el label aparece a la izquierda en móvil -->
```
Referencia: tablas de movimientos / resumen mensual / deudas en finanzas (M1).
Tablas de ≤3 columnas simples pueden quedarse con `overflow-x-auto`.

### 3. Tipografía fluida
La base es el tamaño **móvil**; se agranda en `sm:`/`lg:`. Cuerpo legible ≥14px.
```html
<h1 class="text-3xl sm:text-4xl">          <!-- titular -->
<div class="text-2xl sm:text-3xl">…</div>  <!-- número de KPI -->
```

### 4. Touch targets ≥ 44px
Los controles táctiles deben medir ≥44px. Los botones `size="sm"` (36px) se elevan
en móvil con `className="max-sm:h-11 max-sm:px-5"`. Nada debe depender **solo** de
`hover` (no existe en táctil): toda acción hover debe tener equivalente tap/visible.

### 5. Inputs y filtros
Full-width en móvil, ancho natural en desktop; las barras de filtros usan `flex-wrap`.
```html
<input class="w-full sm:w-56" />
<div class="flex flex-wrap gap-2">…filtros…</div>
```

### 6. Layout y safe-area
- `container-app` (`globals.css`) lleva padding lateral responsive.
- Respetar el notch / barra inferior con `env(safe-area-inset-*)` cuando haya
  elementos fijos (p. ej. la bottom nav).
- Grids: 1 columna en móvil → `sm:grid-cols-2` → `lg:grid-cols-4`.

### 7. Light + dark
Toda pantalla se prueba en ambos temas (usar tokens semánticos, nunca colores sueltos).

## DoD móvil (checklist antes de mergear cualquier módulo)
- [ ] Probado a **360–390px** de ancho (teléfono típico) en light **y** dark.
- [ ] **Sin scroll horizontal** accidental.
- [ ] Tablas densas reflujadas (`.reflow-cards`) o con scroll **intencional** e indicado.
- [ ] Touch targets ≥44px; ninguna acción depende solo de `hover`.
- [ ] Navegación principal alcanzable con el pulgar.
- [ ] Tipografía legible (cuerpo ≥14px) y titulares escalados.
- [ ] `safe-area` respetada si hay elementos fijos.
- [ ] Cubierto por test RTL (DoD general) y, si aplica, story en Storybook.

## Cómo verificar
- **Dev:** `npm run dev` + responsive del navegador (iPhone SE/12, Pixel).
- **Storybook:** `npm run storybook` con los viewports + toggle de tema y a11y.

## Anti-patrones (NO hacer)
- Diseñar desktop y "encoger" (es lo que rompió la UX móvil de M1 al inicio).
- Tablas de 5–6 columnas sin reflow ni scroll intencional.
- Chips/controles de navegación "flotando" sin superficie contenedora.
- Tamaños fijos en px que no escalan; texto < 14px en cuerpo.
- Acciones disponibles solo en `hover`.

> Lección de origen: ver memoria del proyecto. M1 nació "desktop encogido" y se
> rehízo mobile-first (bottom nav + tablas-tarjeta). Este documento existe para que
> **ningún módulo vuelva a sentirse no-nativo en móvil**.
