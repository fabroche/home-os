# `lib/services` — orquestación de dominio

Capa que **coordina** `lib/notion` + `lib/supabase` + `lib/email` + `lib/ai` para resolver casos de uso
(p. ej. "conciliar una factura del correo con un gasto de Notion y reflejarlo en Supabase").

## Reglas
- Aquí vive la **lógica de negocio** (no en la capa de acceso a datos).
- Entradas/salidas en **tipos de dominio** (`src/types`), nunca shapes crudos de Notion.
- Sin estado oculto; funciones puras siempre que sea posible (testeable por `qa-testing`).
