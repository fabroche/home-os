# presentacion/

Documentos PDF con el sistema de diseño de home-os (tema oscuro). Hechos con **HTML + CSS → Chromium (Playwright)**.

Metodología completa y reutilizable: **`docs/transversal/generador-documentos-pdf.md`**.

## Generar

```powershell
node presentacion/generate.mjs    # un PDF por cada documento .html
node presentacion/build-todo.mjs  # combina los compartibles en Nucleo-presentacion-completa.pdf
```

(Una sola vez, si hace falta: `npx playwright install chromium`.)

## Documentos

| Archivo | Qué es | ¿Compartible? |
|---------|--------|:---:|
| `00-portada.html` | Portada del combinado | sí |
| `01-dossier-homeos.html` | Dossier de la app (showcase de capacidad) | sí |
| `02-vision-idea.html` | La idea de negocio («Núcleo», provisional) | sí |
| `03-roles-cocreacion.html` | Roles + preguntas de co-creación | sí |
| `04-guion-tarde.html` | **Guion privado del anfitrión** | **NO** |
| `05-diagramas.html` | Embudo · plan por fases · encaje (+ PNGs) | sí |
| `06-numeros.html` | Mini-proyección con números de ejemplo | sí |

`build-todo.mjs` **excluye a propósito** `04-guion-tarde` del PDF combinado (es privado).

## Editar

1. Tocar el `.html` (o `assets/styles.css` para el diseño global).
2. **Verificar el encaje A4**: cada `<section class="page">` debe medir **1123 px**; si supera 1124, recortar.
3. Regenerar con los comandos de arriba.

> Los `*.pdf` y `*.png` son **artefactos generados**. Se versionan por comodidad (es el entregable),
> pero se reconstruyen con `generate.mjs` / `build-todo.mjs` desde los `.html` + `styles.css`.
