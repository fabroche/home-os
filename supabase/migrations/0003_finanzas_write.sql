-- =============================================================================
-- home-os · M1 Finanzas (escritura) — soporte de comprobantes y subida de archivos
-- - Bucket de Storage PÚBLICO 'finanzas' (factura + comprobante; rutas con uuid).
-- - Columna `comprobantes` en el espejo `movimiento` (la factura ya es `facturas`).
-- Aplicar en el SQL editor de Supabase Studio (o vía psql con SUPABASE_DB_URL).
-- =============================================================================

-- --- columna comprobantes (espejo de la nueva propiedad files de Notion) ------
alter table public.movimiento
  add column if not exists comprobantes jsonb not null default '[]'::jsonb;

-- --- bucket de Storage público ----------------------------------------------
insert into storage.buckets (id, name, public)
values ('finanzas', 'finanzas', true)
on conflict (id) do update set public = true;

-- Lectura pública vía URL (/object/public/...) no pasa por RLS; escritura sí.
drop policy if exists finanzas_auth_insert on storage.objects;
create policy finanzas_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'finanzas');

drop policy if exists finanzas_auth_update on storage.objects;
create policy finanzas_auth_update on storage.objects
  for update to authenticated using (bucket_id = 'finanzas');

drop policy if exists finanzas_auth_delete on storage.objects;
create policy finanzas_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'finanzas');
