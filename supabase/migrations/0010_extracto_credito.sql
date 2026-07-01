-- 0010_extracto_credito.sql
-- Extracto de tarjeta de crédito: liquidación de cargos. Un cargo a crédito (gasto con
-- tarjeta_id de una tarjeta de crédito) NO toca el banco hoy; al PAGAR EL EXTRACTO el dinero
-- sale de la cuenta que liquida la tarjeta. Modelamos eso con `liquidado_at`:
--   · liquidado_at IS NULL  → cargo pendiente (suma a "cuánto pagarás del extracto").
--   · liquidado_at = <ts>   → ya pagado; al liquidar se le estampa además la `cuenta_id` de
--                             la tarjeta, así el balance de esa cuenta baja (el dinero salió).
-- No se crea ningún movimiento de "pago": el gasto ya se reconoció al hacer el cargo; estampar
-- la cuenta al liquidar evita la doble contabilidad en el balance global. Ver M1-finanzas §5.x.

alter table public.movimiento add column if not exists liquidado_at timestamptz;

-- Cargos a crédito aún pendientes de liquidar (lo que compone el extracto por pagar).
create index if not exists movimiento_pendiente_liquidar_idx
  on public.movimiento (tarjeta_id)
  where liquidado_at is null and tarjeta_id is not null;
