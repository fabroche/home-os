-- =============================================================================
-- home-os · M6 — reintentos con backoff en la cola de jobs
-- `next_attempt_at` permite re-encolar un job fallido para más tarde (backoff) sin
-- que el drain lo vuelva a tomar de inmediato. `tomar_ai_job` solo toma los listos.
-- Aplicar en el SQL editor de Supabase Studio (o vía psql con SUPABASE_DB_URL).
-- =============================================================================

alter table public.ai_jobs
  add column if not exists next_attempt_at timestamptz not null default now();

-- Índice de "pendientes listos" para el claim.
create index if not exists ai_jobs_listos_idx
  on public.ai_jobs (next_attempt_at)
  where estado = 'pendiente';

-- Claim atómico: solo pendientes cuyo next_attempt_at ya venció (FIFO, SKIP LOCKED).
create or replace function public.tomar_ai_job()
returns setof public.ai_jobs
language sql
as $$
  update public.ai_jobs
     set estado = 'ejecutando', intentos = intentos + 1
   where id = (
     select id
       from public.ai_jobs
      where estado = 'pendiente' and next_attempt_at <= now()
      order by created_at
      limit 1
      for update skip locked
   )
  returning *;
$$;
