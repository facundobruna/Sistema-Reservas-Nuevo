# syntax=docker/dockerfile:1

# ============================================================================
#  Sistema de Reservas — imagen del FRONTEND
#
#  Este contenedor sirve las pantallas y nada más: no tiene ORM, ni driver de
#  Postgres, ni el secreto de firma de sesiones. Todo lo que necesita se lo
#  pide por HTTP al backend (ver BACKEND_INTERNAL_URL en next.config.ts).
#
#  Tres etapas: deps → builder → runner. No hay etapa `migrator` acá: el
#  esquema de la base es asunto del backend.
# ============================================================================

# ---------------------------------------------------------------------------
# Etapa 1 — deps: node_modules, cacheado mientras no cambie el lock.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Etapa 2 — builder: compila las pantallas a .next/standalone.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---------------------------------------------------------------------------
# Etapa 3 — runner: la imagen que se publica. Solo el server compilado.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/facundobruna/Sistema-Reservas-Nuevo"
LABEL org.opencontainers.image.description="Sistema de Reservas — frontend web (Next.js 16)"
LABEL org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# public/ va versionada con un .gitkeep aunque hoy esté vacía: git no versiona
# directorios vacíos, y sin el archivo la carpeta no llega al contexto de build
# y este COPY falla. Es la carpeta de assets estáticos que sirve Next.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001

CMD ["node", "server.js"]
