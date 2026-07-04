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
- **Staff:** un usuario `owner` — login en `/admin/demo/login` con `owner@fuegonorte.demo` / `demo1234`

## Panel del restaurante

`/admin/{slug}/login` → panel en `/admin/{slug}` (zonas, mesas, combos, servicios, turnos, excepciones, configuración). El login es por restaurante (mismo patrón que `/r/{slug}` del comensal) porque el email de un staff solo es único dentro de su restaurante, no globalmente. La sesión es una cookie httpOnly firmada (HMAC, sin tabla de sesiones ni librería de auth). Roles `owner`/`manager` pueden editar configuración; `host` queda para operar la agenda (milestone posterior).

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
    mesa.ts            # createMesa/updateMesa/deleteMesa: mantienen su seating_unit 'single' en sincro
    seating-unit.ts   # createCombo/updateCombo: seating_unit 'combo' + sus mesas enlazadas
    restaurant.ts     # getRestaurantBySlug
  app/api/v1/
    auth/staff/        # login (scoped por slug) / logout
    admin/             # CRUD REST: zones, mesas, seating-units, services, shifts, exceptions, settings
  app/admin/[slug]/    # Panel: login público + rutas protegidas (grupo (protected))
  app/api/v1/r/[slug]/availability/  # GET público: horarios disponibles
  lib/
    availability/    # computeAvailability (pura, sin DB) + loadAvailabilityInput (glue con Postgres)
    email/           # Interfaz EmailSender
    auth/            # password.ts (hash scrypt) · session.ts (cookie firmada) · require-staff.ts (guards)
    i18n/            # Copy ES/EN
    validation/      # Schemas zod compartidos (admin.ts, auth.ts, booking.ts)
  jobs/             # Workers pg-boss (confirmación + recordatorio)
tests/
  unit/             # Motor de disponibilidad (lógica pura) — los 7 casos obligatorios de la spec
  integration/      # Concurrencia, API
docker-compose.yml   # Postgres 17 local
.env.example         # Todas las variables necesarias
```

## Notas de arquitectura

- **Multi-tenant:** toda query de negocio va scoped por `restaurant_id`. Nunca se cruzan datos entre tenants.
- **Anti doble-booking:** `reservation_mesa` tiene un constraint `EXCLUDE USING gist (mesa_id WITH =, periodo WITH &&)` sobre un rango semiabierto (`tstzrange(..., '[)')`) — dos reservas que se tocan en el borde (ej. 20:00–21:30 y 21:30–23:00) no cuentan como solapadas, pero cualquier solape real es rechazado a nivel de base de datos incluso bajo concurrencia.
- **Mesas y seating units:** el motor de disponibilidad opera siempre sobre `seating_unit`. Cada mesa genera automáticamente su unidad `single`; los combos (`kind='combo'`) enlazan varias mesas para grupos grandes. Un trigger de Postgres (`mesa_delete_cleanup_single_unit`) borra la unidad `single` de una mesa al borrarse esta — por cualquier camino, incluida la cascada al borrar su zona — para que nunca quede una unidad "fantasma" sin mesas reales que el motor pueda ofrecer como disponible.
- Identificadores de tablas/columnas siguen el vocabulario de la spec (mezcla inglés + `mesa`, `periodo`, `sin_solape`) — no se traducen.
- **Motor de disponibilidad:** `computeAvailability` es una función pura (sin DB, en `src/lib/availability/compute-availability.ts`), testeada con Vitest. Opera sobre instantes absolutos (UTC) calculados en el timezone del restaurante vía Luxon; el `periodo` semiabierto se respeta también acá (dos turnos que se tocan en el borde no se consideran solapados). `GET /api/v1/r/{slug}/availability?date=&partySize=&zoneId=` arma el input desde Postgres (`loadAvailabilityInput`) y llama a la función pura — la separación es deliberada para que la lógica de negocio se pueda testear sin base de datos.
