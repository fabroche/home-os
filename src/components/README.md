# `components`

- `ui/` — componentes shadcn/ui (generados con la CLI; base new-york, slate).
- `layout/` — navbar, sidebar, shell del dashboard.
- `dashboard/`, `finanzas/`, `calendario/`, `backoffice/`, `contexto/` — componentes por módulo.
- `shared/` — reutilizables transversales.

**DoD (Definition of Done)** de cada componente no trivial: implementación + test (RTL) — lo vigila el
subagente `qa-testing`. React 19: `ref` es prop normal (no `forwardRef`). Clases condicionales con `cn()`.
