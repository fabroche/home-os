-- 0008_cuentas_tarjetas.sql
-- Modelo financiero nativo (Supabase): cuentas de banco y tarjetas (débito/crédito),
-- más las columnas de etiquetado en `movimiento` (cuenta/tarjeta/persona). Ver
-- docs/modules/M1-finanzas.md §5.1. Todo nativo: la app es la fuente de verdad.

-- ===== CUENTA (banco) =====
create table if not exists public.cuenta (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  nombre        text not null,
  tipo          text not null default 'corriente' check (tipo in ('corriente', 'ahorro', 'efectivo')),
  saldo_inicial numeric(12,2) not null default 0,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table public.cuenta enable row level security;
drop policy if exists cuenta_owner on public.cuenta;
create policy cuenta_owner on public.cuenta
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists cuenta_activos_idx on public.cuenta (activo) where activo;

-- ===== TARJETA (débito/crédito) =====
create table if not exists public.tarjeta (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  cuenta_id   uuid references public.cuenta(id) on delete set null,
  nombre      text not null,
  tipo        text not null check (tipo in ('debito', 'credito')),
  limite      numeric(12,2),                          -- solo crédito
  dia_corte   int check (dia_corte between 1 and 28), -- solo crédito
  dia_pago    int check (dia_pago between 1 and 28),  -- solo crédito
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.tarjeta enable row level security;
drop policy if exists tarjeta_owner on public.tarjeta;
create policy tarjeta_owner on public.tarjeta
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists tarjeta_cuenta_idx on public.tarjeta (cuenta_id);
create index if not exists tarjeta_activos_idx on public.tarjeta (activo) where activo;

-- ===== Etiquetado en MOVIMIENTO (cuenta / tarjeta / persona) =====
alter table public.movimiento add column if not exists cuenta_id uuid references public.cuenta(id) on delete set null;
alter table public.movimiento add column if not exists tarjeta_id uuid references public.tarjeta(id) on delete set null;
alter table public.movimiento add column if not exists persona text;
create index if not exists movimiento_cuenta_idx on public.movimiento (cuenta_id);
create index if not exists movimiento_tarjeta_idx on public.movimiento (tarjeta_id);
