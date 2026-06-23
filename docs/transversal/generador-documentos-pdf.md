# T · Generador de documentos PDF (deck, pitch, reportes)

Metodología para producir **documentos PDF profesionales** con el sistema de diseño de home-os
(identidad editorial, **tema oscuro**), a partir de **HTML + CSS** renderizado con **Chromium (Playwright)**.

Nació para la **presentación a la posible cofundadora** (`presentacion/`), pero está pensada para
**reutilizarse**: pitch decks, one-pagers, reportes financieros, propuestas, dossiers, etc.

> **Por qué este enfoque y no otro:** maquetar en HTML/CSS y exportar con Chromium da **fidelidad total**
> al sistema de diseño (mismas fuentes web, gradientes, `oklch`, sombras) con **control fino** del layout,
> sin pelear con librerías tipo ReportLab/WeasyPrint. Playwright **ya es dependencia** del repo (E2E), así
> que no añade nada nuevo.

## Pipeline

```
NN-nombre.html  ─┐
assets/styles.css ├─► Chromium (page.pdf, A4) ─► NN-nombre.pdf
                 ┘                              └─► PNG por página (opcional, para slides)
```

- **`assets/styles.css`** — el "kit de diseño": tokens del tema oscuro + clases reutilizables. **Es el activo reutilizable.**
- **`NN-nombre.html`** — un documento. Cada `<section class="page">` es **una página A4**.
- **`generate.mjs`** — recorre todos los `*.html` y genera un PDF por cada uno.
- **`build-todo.mjs`** — concatena varios documentos en **un PDF para imprimir** (puede **excluir** los privados).

## Comandos

```powershell
node presentacion/generate.mjs    # un PDF por documento (+ los HTML que existan)
node presentacion/build-todo.mjs  # combina los documentos compartibles en un solo PDF
```

Requiere el navegador de Playwright instalado (`npx playwright install chromium`, una vez).

## Reglas de maquetación (A4)

- **1 página = `<section class="page">`**. Medidas: **210 × 297 mm**, que a 96 dpi son **794 × 1123 px**.
- `.page` tiene `min-height: 297mm` y `page-break-after: always`. Si el contenido **supera 1123 px**,
  desborda a una segunda página (página fantasma). **Hay que medir y ajustar hasta que cada página quepa.**
- El render usa `printBackground: true` + `preferCSSPageSize: true` para respetar fondos y el `@page { size: A4 }`.

### Loop de verificación (obligatorio al crear/editar)

1. **Medir** la altura de cada `.page` con un script efímero (`getBoundingClientRect().height`).
   Cualquier valor **> 1124 px = OVERFLOW** → recortar márgenes/contenido e iterar.
2. **Capturar** screenshots (`locator('.page').nth(i).screenshot()`) para **revisar el render real**
   (las fuentes, los conectores CSS y los acentos serif hay que verlos, no solo medirlos).
3. Esperar **siempre** a las fuentes antes de medir/exportar: `await document.fonts.ready` + `waitUntil: 'networkidle'`
   (las webfonts cargan de Google Fonts por `@import`).

> Los scripts de medición/captura son **efímeros**: se crean, se usan y **se borran**. No se commitean.

## Sistema de diseño (resumen del kit)

Replica los tokens reales de `src/app/globals.css` (tema oscuro):

- **Fuentes:** Inter Tight (cuerpo/datos) + Instrument Serif *italic* (acentos), vía `@import` de Google Fonts.
- **Marca:** violeta `#6a4bff` / `#4928fd`. **Acentos:** iris `#ba81ee`, azure `#70b5ff`, tangerine `#ffaf68`, lime `#79d45e`, blush `#f4889a`.
- **Fondo:** `#12141c`; tarjetas `#1b1e2a`; texto `#f5f6f8`; atenuado `#a8aebd`.

Clases reutilizables principales:

| Clase | Para qué |
|-------|----------|
| `.page` / `.page.cover` | página A4 / portada (con `glow`) |
| `.serif` | acento serif en cursiva dentro de un titular |
| `.card` (+ `.tint-brand/iris/azure/lime`) | tarjeta, con borde tintado opcional |
| `.pill` (+ `.solid/iris/azure/lime/tang`) | etiqueta/píldora |
| `.grid .grid-2/.grid-3`, `.stack` | rejillas y apilados |
| `.kpi` | métrica grande (valor + label) |
| `.flow / .flow-node / .flow-link / .branch` | **diagramas de flujo** verticales con conectores |
| `.merge / .plus / .merge-out` | dos columnas que se funden en un resultado |
| `.phase-card / .bridge` | fases con "puente" entre ellas |
| `.ask` + `.writeline` | caja de pregunta abierta (co-creación) con línea para escribir |
| `.glow` | blob de gradiente decorativo (**absoluto**, fuera de flujo) |

## Cómo añadir un documento nuevo

1. Crear `presentacion/NN-nombre.html` enlazando `assets/styles.css`.
2. Estructurar el contenido en `<section class="page">…</section>`, una por hoja, usando las clases del kit.
3. Correr el **loop de verificación** (medir + capturar) hasta que **todas** las páginas den `1123`.
4. `node presentacion/generate.mjs` para el PDF. Si va al combinado, añadirlo al array `order` de `build-todo.mjs`.

## Principios de copy (importante)

El diseño no salva un texto flojo. Reglas (método Corey Haines + voz del proyecto):

- **Claridad sobre ingenio.** Voz activa. **Lenguaje del lector, cero jerga** (traducir features a beneficios).
- **Concreto sobre vago.** Beneficios y resultados, no listas de funciones.
- **Tono adecuado a la audiencia.** Si no es técnica, nada de tecnicismos que intimiden.
- **No abusar de los guiones largos (—)**: dan sensación de "texto de bot". Comas, puntos y paréntesis.
- Editar por **pasadas** (claridad → voz → beneficio → prueba → emoción → reducir riesgo).
- Cuidar la **voz/persona** (género, "yo" vs "nosotros") de forma coherente en todo el documento.

## Gotchas resueltos

- **Glows en el flujo:** la regla base `.page > * { position: relative }` pisaba a `.glow` y lo metía en el
  flujo (sumaba cientos de px fantasma). Fix: `.glow { position: absolute !important; }`.
- **`EBUSY` al exportar:** si el PDF está **abierto** en un visor, Windows bloquea la sobrescritura.
  `generate.mjs`/`build-todo.mjs` lo capturan y escriben una copia `*.NUEVO.pdf` en vez de abortar.
  Recomendación: cerrar los PDF antes de regenerar.
- **Fuentes a medias:** sin `document.fonts.ready` el PDF sale con la fuente de respaldo. Esperar siempre.
- **Documentos privados:** `build-todo.mjs` **excluye a propósito** el guion del anfitrión para no imprimirlo
  ni entregarlo por error. Mantener separado todo lo que no sea para el destinatario.

## Estructura de archivos

```
presentacion/
  assets/styles.css        ← kit de diseño reutilizable
  00..NN-*.html            ← documentos (1 section.page = 1 hoja A4)
  *.pdf                    ← PDFs generados (artefactos)
  diagrama-*.png           ← diagramas como imagen (para slides)
  generate.mjs             ← genera un PDF por documento
  build-todo.mjs           ← combina los compartibles en un PDF
  README.md                ← guía rápida de esta carpeta
```
