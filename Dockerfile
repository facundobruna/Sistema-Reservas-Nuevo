# syntax=docker/dockerfile:1

# ============================================================================
#  Sistema de Reservas — imagen de la aplicación
#
#  La app es un monolito Next.js: el App Router sirve las páginas (frontend) y
#  las rutas de src/app/api/** son la API (backend). Front y back compilan al
#  mismo artefacto, así que hay un solo Dockerfile — separarlos sería inventar
#  un borde que el framework no tiene.
#
#  Cuatro etapas: deps → builder → (migrator | runner).
#  Solo `runner` viaja al registry; las intermedias existen para no arrastrar
#  el toolchain de compilación a la imagen final.
# ============================================================================

# ---------------------------------------------------------------------------
# Etapa 1 — deps: instala node_modules (incluidas devDependencies, que hacen
# falta para compilar). Se cachea mientras no cambien package.json ni el lock:
# por eso se copian ANTES que el código.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Etapa 2 — builder: compila la app. `output: "standalone"` (next.config.ts)
# deja en .next/standalone un server.js con solo las dependencias trazadas.
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
# Etapa 3 — migrator: imagen de un solo uso que aplica las migraciones y
# termina. No es un servicio: corre una vez, antes de que arranque la app.
# Necesita el toolchain (tsx + drizzle) que la imagen final no tiene, y por eso
# es una etapa aparte y no un paso del arranque del runner.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS migrator
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
CMD ["pnpm", "db:migrate"]

# ---------------------------------------------------------------------------
# Etapa 4 — runner: la imagen que se publica y se despliega. Sin SDK, sin
# pnpm, sin devDependencies y sin código fuente: solo el server compilado.
# Corre como usuario sin privilegios.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# 0.0.0.0 y no localhost: adentro del contenedor hay que escuchar en todas las
# interfaces para que el puerto publicado sea alcanzable desde afuera.
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# CMD y no ENTRYPOINT: es el comando por defecto y se puede reemplazar desde
# `docker run` o desde compose sin tener que pelear con --entrypoint.
CMD ["node", "server.js"]
