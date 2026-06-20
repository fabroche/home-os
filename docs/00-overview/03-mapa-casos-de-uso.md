# 03 · Mapa de casos de uso

```mermaid
flowchart LR
  user([Usuario])
  ia([Agente IA headless])
  sys([Worker / cron])

  user --> uc1[Ver dashboard unificado]
  user --> uc2[Consultar finanzas y reportes]
  user --> uc3[Planificar viaje / evento]
  user --> uc4[Revisar bandeja de triaje]
  user --> uc5[Editar banco de contexto]
  user --> uc6[Conectar cuenta de correo / Notion / Calendar]

  sys --> uc7[Sincronizar Notion <-> Supabase]
  sys --> uc8[Pollear correos nuevos]
  sys --> uc9[Descubrir eventos de interés]
  sys --> uc10[Disparar recordatorios]

  ia --> uc11[Clasificar correo / extraer factura]
  ia --> uc12[Conciliar factura con gasto]
  ia --> uc13[Resumir eventos / sugerir agenda]
  ia --> uc14[Responder consultas sobre finanzas - RAG]
```

## Casos de uso → módulos
| UC | Caso de uso | Módulo(s) | Actor |
|----|-------------|-----------|-------|
| UC1 | Dashboard unificado | M5 | Usuario |
| UC2 | Finanzas y reportes | M1 | Usuario |
| UC3 | Planificar viaje/evento | M2 | Usuario |
| UC4 | Bandeja de triaje | M3 | Usuario |
| UC5 | Editar banco de contexto | M4 | Usuario |
| UC6 | Conectar integraciones (OAuth/IMAP/Notion) | M3, M7, T1–T3 | Usuario |
| UC7 | Sync Notion↔Supabase | M1, T1 | Worker |
| UC8 | Polling de correo | M3, T2 | Worker |
| UC9 | Descubrimiento de eventos | M2, T3 | Worker |
| UC10 | Recordatorios | M2 | Worker |
| UC11 | Clasificar/extraer factura | M3, M6 | IA |
| UC12 | Conciliar factura↔gasto | M1, M6 | IA |
| UC13 | Resumir/sugerir agenda | M2, M6 | IA |
| UC14 | RAG sobre finanzas/contexto | M4, M6 | IA |

## Flujo estrella: factura por correo → gasto conciliado
```mermaid
sequenceDiagram
  participant W as Worker
  participant E as Correo (Gmail/IMAP)
  participant DB as Supabase
  participant J as ai_jobs
  participant R as Runner IA (Claude headless)
  participant N as Notion
  W->>E: polling cuentas
  E-->>W: correos nuevos
  W->>DB: upsert CORREO (idempotente)
  W->>J: encolar "clasificar+extraer factura"
  R->>J: toma job
  R->>DB: crea FACTURA + marca es_factura
  R->>J: encolar "conciliar con gasto"
  R->>N: crea/empareja GASTO (si procede)
  R->>DB: FACTURA.estado=conciliada + AUDIT_LOG
```
