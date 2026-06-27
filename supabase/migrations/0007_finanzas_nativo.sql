-- 0007_finanzas_nativo.sql
-- Fase B (Supabase-nativo): movimiento/deuda ganan identidad propia y `origen`.
--
-- Hasta ahora la identidad ERA `notion_page_id` (PK). Para poder crear filas NATIVAS de la
-- app (sin página de Notion) introducimos `id uuid` como PK real; `notion_page_id` pasa a
-- ENLACE OPCIONAL (nullable + unique) que solo llevan las filas importadas de Notion.
-- `origen` distingue quién manda cada fila: el importador (sync) solo gobierna `origen='notion'`.
--
-- Las filas existentes (vinieron de Notion) reciben un `id` generado y quedan `origen='notion'`.
-- Cambia la PK: aplicar en una ventana tranquila.

-- ===== MOVIMIENTO =====
alter table public.movimiento add column if not exists id uuid not null default gen_random_uuid();
alter table public.movimiento add column if not exists origen text not null default 'notion';

alter table public.movimiento drop constraint if exists movimiento_pkey;
alter table public.movimiento add constraint movimiento_pkey primary key (id);

alter table public.movimiento alter column notion_page_id drop not null;
alter table public.movimiento add constraint movimiento_notion_page_id_key unique (notion_page_id);

alter table public.movimiento drop constraint if exists movimiento_origen_check;
alter table public.movimiento
  add constraint movimiento_origen_check check (origen in ('notion', 'app', 'email', 'manual'));

create index if not exists movimiento_origen_idx on public.movimiento (origen);

-- ===== DEUDA =====
alter table public.deuda add column if not exists id uuid not null default gen_random_uuid();
alter table public.deuda add column if not exists origen text not null default 'notion';

alter table public.deuda drop constraint if exists deuda_pkey;
alter table public.deuda add constraint deuda_pkey primary key (id);

alter table public.deuda alter column notion_page_id drop not null;
alter table public.deuda add constraint deuda_notion_page_id_key unique (notion_page_id);

alter table public.deuda drop constraint if exists deuda_origen_check;
alter table public.deuda
  add constraint deuda_origen_check check (origen in ('notion', 'app', 'email', 'manual'));

create index if not exists deuda_origen_idx on public.deuda (origen);
