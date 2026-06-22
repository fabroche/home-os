-- =============================================================================
-- home-os · M6 Asistente IA — cola de jobs (ai_jobs)
-- La app encola tareas tipadas; el worker (service_role) las drena con el runner
-- de Claude Code headless. Resultado validado con Zod antes de persistir.
-- Aplicar en el SQL editor de Supabase Studio (o vía psql con SUPABASE_DB_URL).
-- =============================================================================

create table if not exists public.ai_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  tipo        text not null,
  payload     jsonb not null default '{}'::jsonb,
  estado      text not null default 'pendiente'
                check (estado in ('pendiente','ejecutando','ok','error')),
  resultado   jsonb,
  intentos    int  not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
-- Índice para el claim FIFO de pendientes.
create index if not exists ai_jobs_estado_idx on public.ai_jobs (estado, created_at);
create index if not exists ai_jobs_user_idx   on public.ai_jobs (user_id);

-- --- RLS (single-user) -------------------------------------------------------
-- El worker usa service_role (bypassa RLS). El usuario solo ve/crea sus jobs.
alter table public.ai_jobs enable row level security;

drop policy if exists ai_jobs_owner on public.ai_jobs;
create policy ai_jobs_owner on public.ai_jobs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- Claim atómico del siguiente job pendiente -------------------------------
-- FIFO por created_at; FOR UPDATE SKIP LOCKED evita que dos runners tomen el
-- mismo job. Marca ejecutando e incrementa intentos en la misma operación.
create or replace function public.tomar_ai_job()
returns setof public.ai_jobs
language sql
as $$
  update public.ai_jobs
     set estado = 'ejecutando', intentos = intentos + 1
   where id = (
     select id
       from public.ai_jobs
      where estado = 'pendiente'
      order by created_at
      limit 1
      for update skip locked
   )
  returning *;
$$;
