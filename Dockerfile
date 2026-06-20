# =============================================================================
# home-os — imagen de la APP web (Next.js standalone). El worker usa worker.Dockerfile.
# =============================================================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- deps --------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# --- build -------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next incrusta las NEXT_PUBLIC_* en BUILD leyendo el .env que Dokploy genera
# con las variables del servicio (el log de build muestra "Environments: .env").
# NO declarar aquí ARG/ENV de NEXT_PUBLIC_*: si Dokploy no pasa el build-arg,
# quedarían vacías y PISARÍAN el .env, rompiendo el cliente del navegador.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner ------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Requiere output: "standalone" en next.config si se quiere imagen mínima.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
