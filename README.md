# Sistema de Reservas

El sistema de reservas más rápido y sin fricción del mercado: gestión de reservas para restaurantes, y nada más. Ver [prompt-maestro-desde-cero.md](./prompt-maestro-desde-cero.md) (fuente de verdad del producto) y [plan.md](./plan.md) (hoja de ruta de construcción).

## Stack

Node.js 22+ · TypeScript · Next.js 16 (App Router) · PostgreSQL 17 · Drizzle ORM · pg-boss · Luxon · Tailwind CSS 4 · Zod · React Query · pnpm.

## Requisitos

- Node.js 22+
- pnpm (`corepack enable` o `npm i -g pnpm`)
- Docker + Docker Compose (para Postgres local)

## Levantar todo desde cero

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env

# 3. Levantar Postgres
docker compose up -d

# 4. Migrar el esquema (extensiones, tablas, constraint anti doble-booking)
pnpm db:migrate

# 5. Sembrar datos de demo (restaurante, zonas, mesas, combos, servicios, turnos)
pnpm db:seed

# 6. Levantar la app
pnpm dev
```

La app queda en [http://localhost:3000](http://localhost:3000).

## Restaurante de demo

El seed (`pnpm db:seed`, idempotente — se puede correr de nuevo sin duplicar datos) crea:

- **Restaurante:** "Fuego Norte" (slug `demo`, timezone `America/Argentina/Buenos_Aires`)
- **Zonas:** Salón principal, Terraza
- **Mesas:** 8 mesas de capacidades variadas (2 a 8 personas) + 2 combos (mesas enlazadas para grupos grandes)
- **Servicios:** Almuerzo (turno *rolling*, cada 15 min) y Cena (turno *fixed*, horarios fijos), abiertos martes a domingo
- **Excepción:** un cierre de ejemplo (evento privado)
- **Staff:** un usuario `owner` (`owner@fuegonorte.demo`) — el login de staff se habilita en un milestone posterior

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta la app en modo desarrollo |
| `pnpm build` / `pnpm start` | Build y arranque en modo producción |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:watch` | Corre los tests (Vitest) |
| `pnpm db:generate` | Genera una migración SQL a partir de `src/db/schema.ts` |
| `pnpm db:migrate` | Aplica las migraciones pendientes contra `DATABASE_URL` |
| `pnpm db:seed` | Siembra el restaurante de demo (borra y recrea el que tenga slug `demo`) |
| `pnpm db:studio` | Abre Drizzle Studio para explorar la base |

## Estructura

```
src/
  app/            # Next.js App Router
  db/
    schema.ts       # Esquema completo en Drizzle (enums + 14 tablas)
    migrations/      # SQL: extensiones, tablas, constraint sin_solape (EXCLUDE)
    client.ts        # Cliente Drizzle (pg Pool)
    migrate.ts        # Corredor de migraciones
    seed.ts           # Seed de demo
    mesa.ts            # createMesa: crea mesa + su seating_unit 'single' en la misma transacción
  lib/
    availability/    # Motor de disponibilidad (computeAvailability, bookReservation) — próximo milestone
    email/           # Interfaz EmailSender
    auth/            # Sesiones staff + magic link comensal
    i18n/            # Copy ES/EN
    validation/      # Schemas zod compartidos
  jobs/             # Workers pg-boss (confirmación + recordatorio)
tests/
  unit/             # Motor de disponibilidad (lógica pura)
  integration/      # Concurrencia, API
docker-compose.yml   # Postgres 17 local
.env.example         # Todas las variables necesarias
```

## Notas de arquitectura

- **Multi-tenant:** toda query de negocio va scoped por `restaurant_id`. Nunca se cruzan datos entre tenants.
- **Anti doble-booking:** `reservation_mesa` tiene un constraint `EXCLUDE USING gist (mesa_id WITH =, periodo WITH &&)` sobre un rango semiabierto (`tstzrange(..., '[)')`) — dos reservas que se tocan en el borde (ej. 20:00–21:30 y 21:30–23:00) no cuentan como solapadas, pero cualquier solape real es rechazado a nivel de base de datos incluso bajo concurrencia.
- **Mesas y seating units:** el motor de disponibilidad opera siempre sobre `seating_unit`. Cada mesa genera automáticamente su unidad `single`; los combos (`kind='combo'`) enlazan varias mesas para grupos grandes.
- Identificadores de tablas/columnas siguen el vocabulario de la spec (mezcla inglés + `mesa`, `periodo`, `sin_solape`) — no se traducen.
