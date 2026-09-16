# syntax=docker/dockerfile:1

# ============================================================================
#  Sistema de Reservas — imagen del BACKEND
#
#  Este contenedor no sirve ninguna pantalla: expone únicamente /api/v1/**.
#  Es la mitad de la separación que arrancó en este TP; la otra mitad está en
#  ../frontend/Dockerfile. Cada una compila por su cuenta, con su propio
#  package.json y su propio node_modules — no comparten nada más que el
#  contrato HTTP.
#
#  Cuatro etapas: deps → builder → (migrator | runner).
#  Solo `migrator` y `runner` viajan al registry; las intermedias existen para
#  no arrastrar el toolchain de compilación a la imagen final.
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
# Etapa 2 — builder: compila la API. `output: "standalone"` (next.config.ts)
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
# termina. No es un servicio: corre una vez, antes de que arranque la API.
# Necesita el toolchain (tsx + drizzle) que la imagen final no tiene, y por eso
# es una etapa aparte y no un paso del arranque del runner.
#
# Vive en el backend y no en el frontend porque el esquema de la base es asunto
# del backend: es el único de los dos que sabe que Postgres existe.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS migrator
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Etiquetas OCI: estándar abierto de metadatos de imagen. `image.source` es la
# que vincula el paquete publicado con este repositorio en GitHub — sin ella,
# ghcr.io no sabe de dónde salió la imagen y la opción "Inherit access from
# source repository" de la cuenta no tiene de qué heredar.
LABEL org.opencontainers.image.source="https://github.com/facundobruna/Sistema-Reservas-Nuevo"
LABEL org.opencontainers.image.description="Sistema de Reservas — migraciones de base de datos"
LABEL org.opencontainers.image.licenses="MIT"
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
# Se invoca `tsx` directamente y NO `pnpm db:migrate`: al correr un script, pnpm
# hace un chequeo de estado de dependencias que dispara un `install` implícito,
# sale a la red a revalidar el lockfile entero y falla. Un contenedor no puede
# depender de internet para arrancar. El binario ya está en la imagen.
CMD ["node_modules/.bin/tsx", "src/db/migrate.ts"]

# ---------------------------------------------------------------------------
# Etapa 4 — runner: la imagen que se publica y se despliega. Sin SDK, sin
# pnpm, sin devDependencies y sin código fuente: solo el server compilado.
# Corre como usuario sin privilegios.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/facundobruna/Sistema-Reservas-Nuevo"
LABEL org.opencontainers.image.description="Sistema de Reservas — API (Next.js 16 + PostgreSQL)"
LABEL org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# 0.0.0.0 y no localhost: adentro del contenedor hay que escuchar en todas las
# interfaces para que el puerto sea alcanzable desde el resto de la red de
# compose (en particular, desde el contenedor del frontend).
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# CMD y no ENTRYPOINT: es el comando por defecto y se puede reemplazar desde
# `docker run` o desde compose sin tener que pelear con --entrypoint.
CMD ["node", "server.js"]
