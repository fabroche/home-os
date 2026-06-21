# M4 · Banco de contexto

| Campo | Valor |
|-------|-------|
| **ID** | M4 |
| **Estado** | 🟩 implementado |
| **Depende de** | M7 (auth), Supabase |
| **Lo usan** | M1, M2, M3, M6 (toda la IA) |

## 1. Propósito y alcance
Almacenar y servir el **conocimiento personal** que la IA necesita para acertar: reglas financieras
(categorías, recurrentes), proveedores conocidos, preferencias de viaje/eventos, contactos, FAQ
personales. Es la "memoria" del asistente.

**Inversión de diseño clave (D7):** **sin embeddings de pago**. La recuperación es por
**metadatos/keyword** (tipo, tag, vigencia) y el **agente headless razona** sobre el texto recuperado
(ventana de contexto amplia). Embeddings **locales** opcionales como mejora futura si el corpus crece.

**Dentro:** CRUD de entradas tipadas + tags + vigencia; recuperación selectiva para la IA.
**Fuera:** generación de la respuesta final (eso es M6).

## 2. Actores
Usuario (administra el conocimiento); Agente IA (consume vía recuperación).

## 3. Requisitos funcionales (RF)
| ID | Requisito | Prioridad |
|----|-----------|:---------:|
| RF-M4-001 | CRUD de entradas tipadas (`regla_financiera`, `proveedor`, `preferencia_viaje`, `contacto`, `faq`, `otro`). | Must |
| RF-M4-002 | Tags libres + vigencia (`vigente_desde/hasta`) + estado (`borrador/publicado/archivado`). | Must |
| RF-M4-003 | Recuperación selectiva: dado tipo(s)+tags+texto, devolver entradas relevantes (filtro + keyword). | Must |
| RF-M4-004 | Las correcciones del usuario en M2/M3 pueden crear/actualizar entradas (p. ej. "remitente de confianza"). | Should |
| RF-M4-005 | Búsqueda/filtrado en la UI. | Should |
| RF-M4-006 | (Futuro) embeddings **locales** opcionales para recuperación semántica gratis. | Could |

## 4. Requisitos no funcionales (RNF)
| ID | Requisito | Métrica |
|----|-----------|---------|
| RNF-M4-001 | Coste IA cero | Recuperación sin API de embeddings de pago. |
| RNF-M4-002 | Recuperación rápida | Índices por `tipo`/`tag`; full-text de Postgres para keyword. |
| RNF-M4-003 | Solo lo vigente | La IA recupera entradas `publicado` y vigentes. |

## 5. Modelo de datos (fragmento)
`ENTRADA_CONTEXTO` + `ENTRADA_CONTEXTO_TAG`. Índice full-text (Postgres `tsvector`) sobre `titulo+contenido`.

## 6. Arquitectura / componentes
- `lib/ai/context/retrieve.ts` — filtra por tipo/tag/vigencia + ranking por keyword (FTS); arma el contexto.
- `lib/actions/contexto.ts` — CRUD (Zod).
- UI: `app/(dashboard)/contexto` — lista + editor.

## 7. Funcionalidades
- **F-M4-1 · CRUD de entradas** — tipadas, con tags y vigencia; auditadas.
- **F-M4-2 · Recuperación selectiva** — `recuperarContexto({tipos, tags, consulta, k})` → fragmentos + metadatos.
- **F-M4-3 · Aprendizaje desde feedback** — acciones del usuario en otros módulos generan entradas (reglas).

```mermaid
flowchart LR
  q[Consulta de la IA: tipos+tags+texto] --> f[Filtrar publicado + vigente]
  f --> r[Ranking keyword - Postgres FTS]
  r --> top[Top-k fragmentos + metadatos]
  top --> agent[Agente headless razona]
```

## 8. Endpoints / Server Actions
| Tipo | Nombre | Entrada | Salida | Auth |
|------|--------|---------|--------|------|
| Server Action | `guardarEntrada/archivarEntrada` | datos (Zod) | entrada | usuario |
| Función | `recuperarContexto` | tipos, tags, consulta, k | fragmentos | IA (worker) |

## 9. Componentes UI (DoD)
| Componente | Test RTL | Estado |
|------------|:--------:|--------|
| `ListaContexto` (filtros) | 🟩 | 🟩 |
| `EditorEntradaContexto` (`EditorEntrada`) | 🟩 | 🟩 |

### Implementación (2026-06-21)
- **Migración:** `supabase/migrations/0002_contexto.sql` — `entrada_contexto` (+ `fts` tsvector
  español generado, GIN), `entrada_contexto_tag`, RLS owner, trigger `updated_at` y la función
  SQL `recuperar_contexto(p_user,p_tipos,p_tags,p_consulta,p_k)` (filtra publicado+vigente, rankea
  con `ts_rank_cd`). **Falta aplicarla en Supabase** (Studio o `psql $SUPABASE_DB_URL`).
- **Tipos:** `src/types/contexto.ts` (Zod: DTO + input de formulario + params de recuperación).
- **Recuperación:** `src/lib/ai/context/retrieve.ts` (`recuperarContexto`, `buildRpcArgs` puro).
- **Datos/acciones:** `src/lib/services/contexto.ts` (lectura RLS) + `src/lib/actions/contexto.ts`
  (`guardarEntrada`, `cambiarEstado`, `eliminarEntrada`; resultado discriminado).
- **UI:** `src/app/(dashboard)/contexto/page.tsx` + `components/contexto/{lista-contexto,editor-entrada}.tsx`
  + primitivas `components/ui/input.tsx` (Input/Textarea/Select/Field).
- **Tests:** 27 verdes (Zod, `buildRpcArgs`, RTL de lista y editor).

## 10. Criterios de aceptación
- [ ] La recuperación nunca devuelve entradas archivadas/no vigentes.
- [ ] La IA de M6 usa el contexto recuperado (trazable en `AI_JOB.payload`).
- [ ] No se llama a ninguna API de embeddings de pago.

## 11. Riesgos y decisiones abiertas
- Calidad de la recuperación por keyword con corpus pequeño suele bastar; medir antes de añadir embeddings locales.
- Definir el conjunto inicial de tipos/tags útiles para tu caso.
