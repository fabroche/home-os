-- =============================================================================
-- home-os · M4 Banco de contexto — conocimiento personal para la IA
-- Sin embeddings de pago (D7): recuperación por tipo/tag/vigencia + FTS de Postgres.
-- Aplicar en el SQL editor de Supabase Studio (o vía psql con SUPABASE_DB_URL).
-- =============================================================================

-- --- entrada_contexto --------------------------------------------------------
create table if not exists public.entrada_contexto (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  tipo           text not null
                   check (tipo in ('regla_financiera','proveedor','preferencia_viaje','contacto','faq','otro')),
  titulo         text not null default '',
  contenido      text not null default '',
  vigente_desde  date,
  vigente_hasta  date,
  estado         text not null default 'borrador'
                   check (estado in ('borrador','publicado','archivado')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Índice full-text (español) sobre título + contenido, generado y siempre fresco.
  fts            tsvector generated always as (
                   to_tsvector('spanish', coalesce(titulo,'') || ' ' || coalesce(contenido,''))
                 ) stored
);
create index if not exists entrada_contexto_user_idx   on public.entrada_contexto (user_id);
create index if not exists entrada_contexto_tipo_idx   on public.entrada_contexto (tipo);
create index if not exists entrada_contexto_estado_idx on public.entrada_contexto (estado);
create index if not exists entrada_contexto_fts_idx    on public.entrada_contexto using gin (fts);

-- --- entrada_contexto_tag ----------------------------------------------------
create table if not exists public.entrada_contexto_tag (
  id          uuid primary key default gen_random_uuid(),
  entrada_id  uuid not null references public.entrada_contexto (id) on delete cascade,
  tag         text not null,
  unique (entrada_id, tag)
);
create index if not exists entrada_contexto_tag_entrada_idx on public.entrada_contexto_tag (entrada_id);
create index if not exists entrada_contexto_tag_tag_idx     on public.entrada_contexto_tag (tag);

-- --- updated_at automático ---------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entrada_contexto_touch on public.entrada_contexto;
create trigger entrada_contexto_touch
  before update on public.entrada_contexto
  for each row execute function public.touch_updated_at();

-- --- RLS (single-user) -------------------------------------------------------
-- El usuario gestiona su propio conocimiento; el worker (service_role) bypassa RLS
-- para la recuperación de la IA.
alter table public.entrada_contexto     enable row level security;
alter table public.entrada_contexto_tag enable row level security;

drop policy if exists entrada_contexto_owner on public.entrada_contexto;
create policy entrada_contexto_owner on public.entrada_contexto
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Los tags se gobiernan a través de su entrada (misma propiedad).
drop policy if exists entrada_contexto_tag_owner on public.entrada_contexto_tag;
create policy entrada_contexto_tag_owner on public.entrada_contexto_tag
  for all to authenticated
  using (
    exists (
      select 1 from public.entrada_contexto e
      where e.id = entrada_contexto_tag.entrada_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.entrada_contexto e
      where e.id = entrada_contexto_tag.entrada_id and e.user_id = auth.uid()
    )
  );

-- --- recuperación selectiva (RF-M4-003) --------------------------------------
-- Filtra publicado + vigente + tipo/tag y rankea por keyword (FTS español).
-- La llama el worker/IA con service_role (scope por p_user). RNF: coste IA cero.
create or replace function public.recuperar_contexto(
  p_user     uuid,
  p_tipos    text[] default null,
  p_tags     text[] default null,
  p_consulta text   default null,
  p_k        int    default 8
)
returns table (id uuid, tipo text, titulo text, contenido text, tags text[], score real)
language sql stable as $$
  select
    e.id, e.tipo, e.titulo, e.contenido,
    coalesce(array_agg(distinct t.tag) filter (where t.tag is not null), '{}') as tags,
    case
      when p_consulta is null or btrim(p_consulta) = '' then 0::real
      else ts_rank_cd(e.fts, websearch_to_tsquery('spanish', p_consulta))
    end as score
  from public.entrada_contexto e
  left join public.entrada_contexto_tag t on t.entrada_id = e.id
  where e.user_id = p_user
    and e.estado = 'publicado'
    and (e.vigente_desde is null or e.vigente_desde <= current_date)
    and (e.vigente_hasta is null or e.vigente_hasta >= current_date)
    and (p_tipos is null or e.tipo = any(p_tipos))
    and (
      p_consulta is null or btrim(p_consulta) = ''
      or e.fts @@ websearch_to_tsquery('spanish', p_consulta)
    )
    and (
      p_tags is null
      or exists (
        select 1 from public.entrada_contexto_tag tt
        where tt.entrada_id = e.id and tt.tag = any(p_tags)
      )
    )
  group by e.id
  order by score desc, e.updated_at desc
  limit greatest(p_k, 1);
$$;
