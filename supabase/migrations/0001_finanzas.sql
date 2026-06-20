-- =============================================================================
-- home-os · M1 Finanzas — espejo de Notion en Supabase (modelo híbrido)
-- Refleja las DBs de Notion: "Presupuesto" → movimiento, "Deudas_Personales" → deuda.
-- Aplicar en el SQL editor de Supabase Studio (o vía psql con SUPABASE_DB_URL).
-- =============================================================================

-- --- movimiento (de Notion "Presupuesto") -----------------------------------
create table if not exists public.movimiento (
  notion_page_id text primary key,
  user_id        uuid,                       -- para RLS (M7); se rellena al implementar auth
  nombre         text not null default '',
  fecha          date,
  importe        numeric(12,2),              -- firmado: gastos/deudas en negativo
  categoria      text,
  tipo           text,
  estado         text,
  flujo          text not null check (flujo in ('ingreso','gasto','deuda')),
  facturas       jsonb not null default '[]'::jsonb,
  url            text,
  ultima_edicion timestamptz not null,
  synced_at      timestamptz not null default now()
);
create index if not exists movimiento_fecha_idx     on public.movimiento (fecha desc);
create index if not exists movimiento_flujo_idx     on public.movimiento (flujo);
create index if not exists movimiento_categoria_idx on public.movimiento (categoria);

-- --- deuda (de Notion "Deudas_Personales") ----------------------------------
create table if not exists public.deuda (
  notion_page_id  text primary key,
  user_id         uuid,
  concepto        text not null default '',
  fecha_creacion  date,
  valor           numeric(12,2),
  persona         text,
  url             text,
  ultima_edicion  timestamptz not null,
  synced_at       timestamptz not null default now()
);
create index if not exists deuda_persona_idx on public.deuda (persona);

-- --- sync_state (cursor de sync incremental Notion→Supabase) ------------------
create table if not exists public.sync_state (
  fuente      text primary key,   -- p.ej. 'notion:presupuesto', 'notion:deudas'
  last_edited timestamptz,        -- last_edited_time del último registro sincronizado
  last_run    timestamptz,
  cursor      text
);

-- --- RLS (single-user) -------------------------------------------------------
-- Se habilita ya para no exponer datos a anon. El worker usa service_role (bypassa RLS).
-- Las políticas para usuarios autenticados se afinan en M7 (cuando exista auth + user_id).
alter table public.movimiento enable row level security;
alter table public.deuda      enable row level security;
alter table public.sync_state enable row level security;

drop policy if exists movimiento_owner on public.movimiento;
create policy movimiento_owner on public.movimiento
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists deuda_owner on public.deuda;
create policy deuda_owner on public.deuda
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- sync_state: solo service_role (sin políticas para authenticated/anon).
