# M5 · Dashboard

| Campo | Valor |
|-------|-------|
| **ID** | M5 |
| **Estado** | 🟧 borrador |
| **Depende de** | M1, M2, M3, M4, M7 |
| **Lo usan** | Usuario |

## 1. Propósito y alcance
Panel unificado: estado de finanzas, agenda de la semana, bandeja de triaje y salud de las integraciones,
en una sola vista. Punto de entrada diario.

**Dentro:** layout/shell del dashboard (navbar/sidebar), widgets resumen por módulo, estado de jobs/sync.
**Fuera:** la lógica de cada dominio (vive en su módulo).

## 2. Actores
Usuario.

## 3. Requisitos funcionales (RF)
| ID | Requisito | Prioridad |
|----|-----------|:---------:|
| RF-M5-001 | Shell del dashboard (navegación a los 4 módulos) responsive. | Must |
| RF-M5-002 | Widget de finanzas (balance del mes, últimos movimientos, facturas pendientes). | Must |
| RF-M5-003 | Widget de agenda (próximos eventos + descubrimientos relevantes). | Must |
| RF-M5-004 | Widget de backoffice (correos por triar, facturas detectadas). | Must |
| RF-M5-005 | Estado del sistema (última sync, jobs IA pendientes/erróneos, cuentas conectadas). | Should |

## 4. Requisitos no funcionales (RNF)
| ID | Requisito | Métrica |
|----|-----------|---------|
| RNF-M5-001 | Carga rápida | RSC + lectura de Supabase; streaming de widgets. |
| RNF-M5-002 | Accesible | Navegación por teclado; contraste correcto. |

## 5. Modelo de datos
Lectura agregada de M1–M4 (vistas SQL). No define entidades propias.

## 6. Arquitectura / componentes
- `components/layout` (shell, sidebar) + `components/dashboard` (widgets).
- Cada widget es un RSC que lee su vista de Supabase; carga en paralelo con `Suspense`.

## 7. Funcionalidades
- **F-M5-1 · Shell + navegación**
- **F-M5-2 · Widgets resumen** (finanzas, agenda, backoffice)
- **F-M5-3 · Estado del sistema** (sync/jobs/integraciones)

## 8. Componentes UI (DoD)
| Componente | Test RTL | Estado |
|------------|:--------:|--------|
| `DashboardShell` (sidebar) | ⬜ | ⬜ |
| `WidgetFinanzas` | ⬜ | ⬜ |
| `WidgetAgenda` | ⬜ | ⬜ |
| `WidgetBackoffice` | ⬜ | ⬜ |
| `EstadoSistema` | ⬜ | ⬜ |

## 9. Criterios de aceptación
- [ ] Desde el dashboard se llega a todos los módulos.
- [ ] Los widgets reflejan datos reales de Supabase y cargan en paralelo.
- [ ] Se ve el estado de sync/jobs y de las cuentas conectadas.

## 10. Riesgos y decisiones abiertas
- Definir las vistas SQL agregadas para no recalcular en cada carga.
- Diseño visual: se decide en `transversal/sistema-de-diseno.md`.
