-- =============================================================================
-- home-os · M1 Finanzas — soft-delete (propagar borrados de Notion al espejo)
-- El sync es UPSERT-only: si borras/archivas una página en Notion, deja de venir
-- en el query y el registro quedaba huérfano en Supabase (inflando KPIs/balance).
-- Añadimos `deleted_at` para marcar (mark-and-sweep) lo que ya no existe en Notion;
-- la UI lee solo los activos (deleted_at is null).
-- Aplicar en el SQL editor de Supabase Studio (o vía psql con SUPABASE_DB_URL).
-- =============================================================================

alter table public.movimiento add column if not exists deleted_at timestamptz;
alter table public.deuda      add column if not exists deleted_at timestamptz;

-- Índices parciales: las lecturas de la UI filtran por activos.
create index if not exists movimiento_activos_idx on public.movimiento (deleted_at) where deleted_at is null;
create index if not exists deuda_activos_idx      on public.deuda (deleted_at)      where deleted_at is null;
