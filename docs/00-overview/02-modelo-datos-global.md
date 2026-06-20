# 02 · Modelo de datos global (ER canónico)

Fuente **única de verdad** del modelo. Los módulos referencian estas entidades; no las redefinen.
Vive en **Supabase (Postgres)**. Las entidades con `notion_page_id` son **espejo híbrido** de Notion
(se editan en Notion, se sincronizan aquí). Todas llevan `user_id` para RLS (single-user, pero explícito).

```mermaid
erDiagram
  CUENTA_CORREO ||--o{ CORREO : recibe
  CORREO ||--o| FACTURA : contiene
  FACTURA ||--o| GASTO : concilia
  GASTO }o--|| CATEGORIA : clasifica
  INGRESO }o--|| CATEGORIA : clasifica
  VIAJE ||--o{ EVENTO : agrupa
  EVENTO ||--o{ RECORDATORIO : dispara
  ENTRADA_CONTEXTO ||--o{ ENTRADA_CONTEXTO_TAG : etiqueta
  AI_JOB }o--|| AI_JOB_TIPO : es

  CUENTA_CORREO {
    uuid id PK
    uuid user_id FK
    text proveedor "gmail | imap"
    text email
    bytea credenciales_cifradas
    text estado "activa | error | pausada"
    timestamptz last_sync
  }
  CORREO {
    uuid id PK
    uuid cuenta_id FK
    text message_id "único por cuenta"
    text remitente
    text asunto
    timestamptz fecha
    text etiqueta_triage
    bool es_factura
    timestamptz created_at
  }
  FACTURA {
    uuid id PK
    uuid correo_id FK
    text proveedor
    numeric importe
    text moneda
    date fecha_emision
    date fecha_vencimiento
    text pdf_url
    text estado "pendiente | conciliada | descartada"
  }
  GASTO {
    uuid id PK
    uuid user_id FK
    text notion_page_id "nullable"
    date fecha
    numeric importe
    text moneda
    uuid categoria_id FK
    text descripcion
    text origen "notion | email | manual"
    timestamptz updated_at
  }
  INGRESO {
    uuid id PK
    uuid user_id FK
    text notion_page_id
    date fecha
    numeric importe
    text moneda
    uuid categoria_id FK
    text descripcion
  }
  CATEGORIA {
    uuid id PK
    text nombre
    text tipo "gasto | ingreso"
  }
  VIAJE {
    uuid id PK
    uuid user_id FK
    text notion_page_id
    text titulo
    text destino
    date fecha_inicio
    date fecha_fin
    text estado "idea | planificado | en_curso | hecho"
  }
  EVENTO {
    uuid id PK
    uuid user_id FK
    text notion_page_id "nullable"
    uuid viaje_id FK "nullable"
    text fuente "manual | calendar | descubierto"
    text titulo
    timestamptz inicio
    timestamptz fin
    text ubicacion
    text modalidad "presencial | remoto | hibrido"
    text url
    numeric relevancia "0..1"
  }
  RECORDATORIO {
    uuid id PK
    uuid evento_id FK
    timestamptz cuando
    text canal "email | push"
    text estado "pendiente | enviado | error"
  }
  ENTRADA_CONTEXTO {
    uuid id PK
    uuid user_id FK
    text tipo "regla_financiera | proveedor | preferencia_viaje | contacto | faq | otro"
    text titulo
    text contenido
    date vigente_desde
    date vigente_hasta
    text estado "borrador | publicado | archivado"
  }
  ENTRADA_CONTEXTO_TAG {
    uuid id PK
    uuid entrada_id FK
    text tag
  }
  AI_JOB {
    uuid id PK
    uuid user_id FK
    text tipo
    jsonb payload
    text estado "pendiente | ejecutando | ok | error"
    jsonb resultado
    int intentos
    text error
    timestamptz created_at
    timestamptz finished_at
  }
  SYNC_STATE {
    uuid id PK
    text fuente "notion_db_id"
    text cursor
    timestamptz last_edited
    timestamptz last_run
  }
  AUDIT_LOG {
    uuid id PK
    uuid user_id FK
    text accion
    text entidad
    uuid entidad_id
    jsonb payload
    timestamptz created_at
  }
```

## Notas de diseño
- **Híbrido Notion↔Supabase**: `GASTO`, `INGRESO`, `VIAJE`, `EVENTO`, `ENTRADA_CONTEXTO` pueden tener
  `notion_page_id`. `SYNC_STATE` guarda el cursor/last_edited por DB de Notion para sync incremental.
- **Idempotencia de correo**: único `(cuenta_id, message_id)` en `CORREO` → no se duplican facturas.
- **Conciliación**: `FACTURA.estado` + FK opcional `GASTO.factura_id` (1:1 lógico).
- **Banco de contexto**: `ENTRADA_CONTEXTO` + tags; recuperación por `tipo`/`tag`/vigencia (sin vectores de pago).
- **IA**: `AI_JOB` desacopla la app del runner; `resultado` validado con Zod antes de persistir.
- **Auditoría**: toda escritura relevante deja traza en `AUDIT_LOG`.
- **RLS**: todas las tablas con `user_id` filtran por el usuario autenticado (ver M7).
