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

## Flujo de reserva del comensal

`/r/{slug}` — wizard de 5-6 pasos (comensales → fecha → horario → zona *solo si hay más de una* → datos → confirmación), con todo el estado en la URL para que atrás/refresh/compartir el link funcionen. Sin login obligatorio: el comensal se linkea/crea por teléfono en el momento de reservar. Conteo de toques medido y documentado en [docs/friction.md](./docs/friction.md) — es un presupuesto, no crece sin discutirlo.

Login opcional por magic link (`/me`, pedís por teléfono, te llega un link por email — en local se ve por consola) para volver a ver tus reservas desde otro dispositivo. No agrega pasos al flujo de reservar.

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
  app/api/v1/r/[slug]/             # GET público (info) · availability/ · reservations/ (+[id])
  app/api/v1/auth/diner/            # magic-link (pedir) · verify (canjear)
  app/api/v1/me/reservations/       # Reservas del comensal logueado (todas las restaurantes)
  app/r/[slug]/                    # Wizard de reserva (el flujo del comensal)
  app/me/                          # Página mínima: login por magic link + lista de reservas
  lib/
    availability/    # computeAvailability + resolveSlot (puros, sin DB) + loadAvailabilityInput (glue con Postgres)
    reservation/     # bookReservation: único punto de escritura, transaccional, best-fit + retry de deadlocks
    email/           # Interfaz EmailSender (console-sender.ts local, resend-sender.ts prod)
    auth/            # signed-token.ts (HMAC compartido) · session.ts (staff) · diner-session.ts · magic-link.ts · require-staff.ts
    i18n/            # Copy ES/EN + interpolate() para templates con {variables}
    validation/      # Schemas zod compartidos (admin.ts, auth.ts, booking.ts, phone.ts)
  jobs/             # Workers pg-boss (confirmación + recordatorio)
tests/
  unit/             # Motor de disponibilidad (lógica pura) — los 7 casos obligatorios de la spec + resolveSlot
  integration/      # bookReservation bajo concurrencia real contra Postgres
docs/
  friction.md        # Conteo de toques del flujo de reserva — presupuesto, no crece sin discutirlo
docker-compose.yml   # Postgres 17 local
.env.example         # Todas las variables necesarias
```

## Notas de arquitectura

- **Multi-tenant:** toda query de negocio va scoped por `restaurant_id`. Nunca se cruzan datos entre tenants.
- **Anti doble-booking:** `reservation_mesa` tiene un constraint `EXCLUDE USING gist (mesa_id WITH =, periodo WITH &&)` sobre un rango semiabierto (`tstzrange(..., '[)')`) — dos reservas que se tocan en el borde (ej. 20:00–21:30 y 21:30–23:00) no cuentan como solapadas, pero cualquier solape real es rechazado a nivel de base de datos incluso bajo concurrencia.
- **Mesas y seating units:** el motor de disponibilidad opera siempre sobre `seating_unit`. Cada mesa genera automáticamente su unidad `single`; los combos (`kind='combo'`) enlazan varias mesas para grupos grandes. Un trigger de Postgres (`mesa_delete_cleanup_single_unit`) borra la unidad `single` de una mesa al borrarse esta — por cualquier camino, incluida la cascada al borrar su zona — para que nunca quede una unidad "fantasma" sin mesas reales que el motor pueda ofrecer como disponible.
- Identificadores de tablas/columnas siguen el vocabulario de la spec (mezcla inglés + `mesa`, `periodo`, `sin_solape`) — no se traducen.
- **Motor de disponibilidad:** `computeAvailability` es una función pura (sin DB, en `src/lib/availability/compute-availability.ts`), testeada con Vitest. Opera sobre instantes absolutos (UTC) calculados en el timezone del restaurante vía Luxon; el `periodo` semiabierto se respeta también acá (dos turnos que se tocan en el borde no se consideran solapados). `GET /api/v1/r/{slug}/availability?date=&partySize=&zoneId=` arma el input desde Postgres (`loadAvailabilityInput`) y llama a la función pura — la separación es deliberada para que la lógica de negocio se pueda testear sin base de datos.
- **Reserva sin doble-booking bajo concurrencia:** `bookReservation` revalida el horario server-side (nunca confía en lo que mandó el cliente) vía `resolveSlot`, y prueba las unidades candidatas en orden best-fit, una transacción por intento. Bajo carga real, Postgres puede resolver dos transacciones que compiten por la misma mesa de dos formas: una viola limpio el `EXCLUDE` (`23P01`, la unidad está tomada) o el detector de deadlocks aborta una de las dos (`40P01`, no dice nada sobre disponibilidad) — `bookReservation` reintenta ante lo segundo y solo pasa a la siguiente unidad ante lo primero. El test de integración de concurrencia lo ejercita de verdad contra Postgres y fue el que hizo aparecer el caso del deadlock.
- **Reservas confirman al toque:** no hay paso de aprobación manual en ningún punto de la spec — `bookReservation` crea la reserva en estado `confirmed` directamente (no `pending`), consistente con la promesa de cero fricción.
- **Branding por tenant:** `restaurant.settings.accentColor` pisa el acento en `/r/{slug}` (ver `src/app/r/[slug]/page.tsx`). Los tokens derivados del acento (`--accent-subtle`, `--ring`, etc.) usan `color-mix()` — y como `color-mix()` se resuelve en el punto donde CADA custom property se declara (no se "recalcula en cascada" al pisar solo `--accent` en un elemento anidado), hay que redeclarar todos los derivados juntos con el color literal del tenant, no alcanza con pisar `--accent` sola.
