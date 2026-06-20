# T4 · Infra & DevOps (Hostinger · Dokploy · Docker)

## Topología
- **Hostinger VPS** con **Dokploy** (PaaS sobre Docker) desplegando `docker-compose.yml`:
  - `app` (Next.js standalone, `Dockerfile`) — puerto 3000, healthcheck `/api/health`.
  - `worker` (`worker.Dockerfile`) — cron + runner IA.
- **Supabase**: gestionado (cloud) o instancia propia. La app/worker se conectan por URL + keys.
- Dominio + TLS gestionados por Dokploy (Traefik).

## Variables de entorno
- En Dokploy, no en el repo. Plantilla: `.env.example`. Secretos sensibles (`SERVICE_ROLE`,
  `ACCOUNT_ENCRYPTION_KEY`, `CRON_SECRET`) solo en el entorno del servidor.

## Cron / jobs
- El `worker` corre `node-cron` (sync Notion, polling correo, descubrimiento, recordatorios, drenar `ai_jobs`).
- Alternativa: cron de Dokploy llamando a `/api/cron/<job>` con `Authorization: Bearer $CRON_SECRET`.

## IA de runtime headless (lo delicado)
- El runner invoca **Claude Code** (`claude -p --output-format json`) con tu **suscripción**.
- Para que funcione en el VPS, Claude Code debe estar **instalado y autenticado** en el contenedor/host
  del worker (montar `~/.claude` autenticado; ver comentario en `docker-compose.yml`).
- **Riesgo**: la autenticación por suscripción headless 24/7 en servidor puede no ser viable/estable
  (login/ToS). **Mitigación**: ejecutar el `worker` (o solo el runner) en **tu máquina local** para
  tareas periódicas; la app en el VPS encola y el runner local drena. El sistema es agnóstico: migrar a
  `ANTHROPIC_API_KEY` es cambiar solo el runner (RF-M6-007).

## Build & deploy
- `npm ci` → `npm run build` (Next standalone). Imágenes multi-stage (ver Dockerfiles).
- CI sugerido: lint + typecheck + test antes de construir imagen.

## Observabilidad
- Logs de contenedores en Dokploy. Healthcheck de la app. Estado de jobs IA visible en el dashboard (M5).
- Backups: Supabase (PITR/export). El espejo se puede reconstruir desde Notion si hace falta.
