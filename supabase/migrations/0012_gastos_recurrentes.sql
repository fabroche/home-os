-- 0012_gastos_recurrentes.sql
-- Gastos recurrentes (M1). Un gasto recurrente (alquiler, suscripciones) se repite cada mes:
-- el worker genera un `movimiento` el día `dia_mes` de cada mes desde `fecha_inicio`. Igual que
-- los gastos a plazos (0009) pero sin fin: `ultima_generada` (YYYY-MM) marca el último mes creado
-- para no duplicar (idempotente + catch-up si el worker estuvo caído). Ver M1-finanzas.

create table if not exists public.gasto_recurrente (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  concepto        text not null,
  monto           numeric(12,2) not null check (monto > 0),  -- magnitud (se firma por el tipo)
  categoria       text not null,
  tipo            text not null,
  dia_mes         int not null default 1 check (dia_mes between 1 and 28),
  fecha_inicio    date not null,
  cuenta_id       uuid references public.cuenta(id) on delete set null,
  tarjeta_id      uuid references public.tarjeta(id) on delete set null,
  persona         text,
  ultima_generada text,                                       -- YYYY-MM del último mes generado
  activo          boolean not null default true,
  created_at      timestamptz not null default now()
);
alter table public.gasto_recurrente enable row level security;
drop policy if exists gasto_recurrente_owner on public.gasto_recurrente;
create policy gasto_recurrente_owner on public.gasto_recurrente
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists gasto_recurrente_activos_idx on public.gasto_recurrente (activo) where activo;
