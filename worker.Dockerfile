# =============================================================================
# home-os — imagen del WORKER (jobs de cron + runner IA headless).
# NOTA sobre la IA de runtime: el runner invoca Claude Code headless con tu
# SUSCRIPCIÓN. Para que funcione en el VPS, Claude Code debe estar instalado y
# autenticado en el contenedor/host (ver docs/transversal/infra-devops.md).
# Si la autenticación por suscripción no es viable 24/7, el runner corre en tu
# máquina local; el resto del sistema no cambia.
# =============================================================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
# Solo dependencias de producción (sin vitest/vite/playwright/etc.). tsx es runtime dep.
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
# Claude Code CLI (motor del runner IA). Versión FIJA para builds reproducibles:
# el contenedor está aislado del host, así que el `claude` del VPS no sirve aquí.
# Auth por CLAUDE_CODE_OAUTH_TOKEN (env); subir el número aquí para actualizar.
RUN npm i -g @anthropic-ai/claude-code@2.1.186
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# tsx ejecuta el worker en TS sin build previo.
CMD ["npx", "tsx", "worker/index.ts"]
