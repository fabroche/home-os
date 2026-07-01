-- 0011_presupuestos.sql
-- Presupuestos por categoría (M1). Un presupuesto fija un TOPE MENSUAL para una categoría de
-- gasto; la UI compara, para el mes en curso, lo gastado en esa categoría contra el tope. Es
-- un tope recurrente (aplica cada mes), no un presupuesto por-mes: setéalo una vez y hace
-- seguimiento mes a mes. Único por (usuario, categoría) → se hace upsert al guardar.

create table if not exists public.presupuesto (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  categoria  text not null,
  monto      numeric(12,2) not null check (monto > 0),  -- tope mensual
  created_at timestamptz not null default now()
);
alter table public.presupuesto enable row level security;
drop policy if exists presupuesto_owner on public.presupuesto;
create policy presupuesto_owner on public.presupuesto
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create unique index if not exists presupuesto_user_cat_idx on public.presupuesto (user_id, categoria);
