# `worker/`

Proceso separado de la app web (contenedor propio, ver `worker.Dockerfile`).

- **Scheduler** (`node-cron`): dispara sync de Notion, polling de correo, descubrimiento de eventos.
- **Runner IA**: ejecuta las tareas de `ai_jobs` invocando **Claude Code headless** con tu suscripción
  (`claude -p --output-format json`). Sin API key.

Arranque local: `npm run worker`. En el VPS necesita Claude Code instalado y autenticado
(o se ejecuta en tu máquina). Ver `docs/transversal/infra-devops.md`.
