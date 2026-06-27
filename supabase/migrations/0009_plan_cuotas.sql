-- 0009_plan_cuotas.sql
-- Gastos a plazos (nativo Supabase). Un plan financia una compra en N cuotas mensuales,
-- normalmente con una tarjeta de crédito. El worker genera la cuota de cada mes (el día de
-- facturación) como un movimiento (cargo en la tarjeta). Ver docs/modules/M1-finanzas.md F-M1-8.

create table if not exists public.plan_cuotas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,
  tarjeta_id       uuid references public.tarjeta(id) on delete set null,
  concepto         text not null,
  monto_total      numeric(12,2) not null,
  num_cuotas       int not null check (num_cuotas between 2 and 120),
  categoria        text not null,
  tipo             text not null,
  fecha_inicio     date not null,
  dia_facturacion  int not null default 1 check (dia_facturacion between 1 and 28),
  persona          text,
  cuotas_generadas int not null default 0,
  estado           text not null default 'activo' check (estado in ('activo', 'completado', 'cancelado')),
  created_at       timestamptz not null default now()
);
alter table public.plan_cuotas enable row level security;
drop policy if exists plan_cuotas_owner on public.plan_cuotas;
create policy plan_cuotas_owner on public.plan_cuotas
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists plan_cuotas_activos_idx on public.plan_cuotas (estado) where estado = 'activo';
