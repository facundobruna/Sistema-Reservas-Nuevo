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

# 7. (Opcional) Levantar el worker de notificaciones, en otra terminal
pnpm worker
```

La app queda en [http://localhost:3000](http://localhost:3000). Sin el worker corriendo, las reservas se siguen creando normalmente — simplemente no salen los emails de confirmación/recordatorio hasta que lo levantes (quedan agendados en `notification`, esperando).

## Restaurante de demo

El seed (`pnpm db:seed`, idempotente — se puede correr de nuevo sin duplicar datos) crea:

- **Restaurante:** "Fuego Norte" (slug `demo`, timezone `America/Argentina/Buenos_Aires`)
- **Zonas:** Salón principal, Terraza
- **Mesas:** 8 mesas de capacidades variadas (2 a 8 personas) + 2 combos (mesas enlazadas para grupos grandes)
- **Servicios:** Almuerzo (turno *rolling*, cada 15 min) y Cena (turno *fixed*, horarios fijos), abiertos martes a domingo
- **Excepción:** un cierre de ejemplo (evento privado)
- **Staff:** un usuario `owner` — login en `/admin/demo/login` con `owner@fuegonorte.demo` / `demo1234`

## Alta de un restaurante nuevo (self-serve)

`/onboarding` — wizard público de 3 pasos (restaurante + link/timezone → cuenta del owner → turnos típicos de almuerzo/cena). Al confirmar crea el restaurante, una zona "Salón principal", los turnos elegidos (abiertos los 7 días, editables después) y el owner, todo en una transacción; abre sesión automáticamente y redirige directo a "Compartí tu reserva". Deliberadamente **no** pide mesas en el alta (para que sea rápida) — el panel avisa en la Agenda si todavía no hay ninguna cargada, porque sin mesas el motor no tiene nada que ofrecer.

## Panel del restaurante

`/admin/{slug}/login` → panel en `/admin/{slug}`. El login es por restaurante (mismo patrón que `/r/{slug}` del comensal) porque el email de un staff solo es único dentro de su restaurante, no globalmente. La sesión es una cookie httpOnly firmada (HMAC, sin tabla de sesiones ni librería de auth).

La portada del panel es la **Agenda** (`/admin/{slug}`): lista de reservas del día con filtros por fecha/estado/zona, botones de cambio de estado (confirmar → sentar → completar, o cancelar/no-show desde cualquier estado anterior a completar), reasignación de mesa y carga manual de walk-ins/reservas telefónicas. El resto de la configuración (zonas, mesas, combos, servicios, turnos, excepciones) se movió a su propia sección de nav, separada de la operación diaria. Roles `owner`/`manager` pueden editar configuración; `host` opera la agenda.

**Comensales** (`/admin/{slug}/customers`) — búsqueda de clientes por nombre/teléfono/email (con su histórico de visitas y no-shows) y exportación a CSV. **Analíticas** (`/admin/{slug}/stats`) — conteo mínimo de entradas/cumplidas/canceladas/no-show por rango de fechas; deliberadamente no es un BI ni reemplaza el sistema de gestión que ya tiene el restaurante.

### Máquina de estados de una reserva

`pending → confirmed → seated → completed`, con `cancelled`/`no_show` alcanzables desde cualquier estado anterior a `completed` (`src/lib/reservation/status-machine.ts`, transiciones inválidas se rechazan). Cancelar o marcar no-show libera la mesa al toque (borra las filas de `reservation_mesa`, la unidad vuelve a estar disponible); completar/no-show actualizan `visit_count`/`no_show_count` del cliente.

### Compartí tu reserva

`/admin/{slug}/share` — todo lo necesario para distribuir el link, calculado en el cliente a partir del restaurante (sin backend propio): el link branded `/r/{slug}` copiable, un texto de WhatsApp con el link ya interpolado (para pegar como respuesta automática en WhatsApp Business, más un botón que abre `wa.me` con el mensaje precargado — **no** se integra la Cloud API de Meta ni se arma un bot), un código QR descargable como PNG (generado 100% local con la librería `qrcode`, sin servicios externos) y un snippet de botón embebible (HTML/CSS autocontenido, con el acento del tenant) para pegar en la web propia del restaurante.

## Flujo de reserva del comensal

`/r/{slug}` — wizard de 5-6 pasos (comensales → fecha → horario → zona *solo si hay más de una* → datos → confirmación), con todo el estado en la URL para que atrás/refresh/compartir el link funcionen. Sin login obligatorio: el comensal se linkea/crea por teléfono en el momento de reservar. Conteo de toques medido y documentado en [docs/friction.md](./docs/friction.md) — es un presupuesto, no crece sin discutirlo.

Login opcional por magic link (`/me`, pedís por teléfono, te llega un link por email — en local se ve por consola) para volver a ver tus reservas desde otro dispositivo. No agrega pasos al flujo de reservar. Desde ahí también se puede **cancelar** o **modificar** (comensales/fecha/hora) cualquier reserva confirmada que todavía no pasó.

Si no hay horarios para la fecha/cantidad pedida, el wizard ofrece **anotarse en lista de espera** (con email, a diferencia del resto del flujo donde es opcional — es el único canal por el que se avisa). El worker de notificaciones revisa las entradas cada 1 minuto y, si aparece disponibilidad real para lo que alguien esperaba, le manda un email con el link para reservar — nadie reserva un lugar por otro, gana quien haga clic primero (el motor ya es seguro bajo concurrencia).

## Notificaciones (confirmación + recordatorio por email)

Al confirmarse una reserva (web, o manual desde el panel cuando no es un walk-in ya sentado) se agendan dos filas en `notification`: una confirmación inmediata y un recordatorio `reminderHoursBefore` horas antes (configurable en Configuración, default 3). El envío real lo hace `pnpm worker` (`src/jobs/worker.ts`), un proceso aparte sobre pg-boss (misma base de Postgres, sin Redis ni broker extra) que cada 1 minuto busca notificaciones vencidas y las manda con el `EmailSender` que ya existía (consola en local, Resend en prod).

- Si el envío falla, reintenta en las siguientes corridas hasta 5 veces y después queda `failed` — no reintenta para siempre.
- Si la reserva no tiene email cargado (es opcional para el comensal), la notificación se marca `failed` directo, sin intentarlo.
- Cancelar una reserva o marcarla `no_show` borra sus notificaciones `scheduled` pendientes — no le llega un recordatorio a algo que ya no va a pasar.
- La confirmación lleva un adjunto `.ics` (generado a mano, sin librería) para agregar la reserva al calendario; el recordatorio no lo repite.

### Modificar una reserva (comensal)

`PATCH /api/v1/r/{slug}/reservations/{id}` con `startsAt`/`partySize` intenta reservar el horario nuevo primero (revalida disponibilidad de verdad vía `bookReservation`) y solo si sale bien cancela la reserva vieja — así una modificación que falla nunca hace perder una reserva confirmada. La nueva reserva pasa por el mismo camino que cualquier reserva (notificaciones + `.ics` incluidos).

### Lista de espera

`waitlist_entry` (`waiting → notified → booked/expired`) vive scoped por restaurante+fecha+comensales. El worker, en la misma corrida de cada minuto, revisa las entradas `waiting`, corre `computeAvailability` para cada una y avisa por email si ahora hay lugar. Si el comensal termina reservando por su cuenta ese día, la entrada se marca `booked`; si la fecha pasó sin que nadie reservara, se marca `expired`.

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
| `pnpm worker` | Levanta el worker de notificaciones (confirmación + recordatorio por email) |

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
    onboarding.ts     # createRestaurantOnboarding: alta self-serve (restaurant + zona + turnos + owner) en una transacción
    notification.ts   # scheduleReservationNotifications + findDue/markSent/markSkipped/recordFailure
    waitlist.ts        # joinWaitlist (idempotente) + findActiveWaitingEntries/markNotified/markBooked/expirePast
  app/api/v1/
    auth/staff/        # login (scoped por slug) / logout
    admin/             # CRUD REST: zones, mesas, seating-units, services, shifts, exceptions, settings
                        # + reservations (agenda, walk-in, cambio de estado, reasignar mesa), customers (buscar + export CSV), stats
    onboarding/        # POST público: alta self-serve de restaurante + owner, abre sesión
  app/admin/[slug]/    # Panel: login público + rutas protegidas (grupo (protected)): agenda (portada), share, zones, mesas,
                        # seating-units, services, shifts, exceptions, customers, stats, settings
  app/onboarding/      # Wizard público de alta de restaurante (3 pasos)
  app/api/v1/r/[slug]/             # GET público (info) · availability/ · reservations/ (+[id], modificar/cancelar) · waitlist/
  app/api/v1/auth/diner/            # magic-link (pedir) · verify (canjear)
  app/api/v1/me/reservations/       # Reservas del comensal logueado (todas las restaurantes)
  app/r/[slug]/                    # Wizard de reserva (el flujo del comensal) + CTA de lista de espera si no hay horarios
  app/me/                          # Login por magic link + lista de reservas, con cancelar/modificar inline
  lib/
    availability/    # computeAvailability + resolveSlot (puros, sin DB) + loadAvailabilityInput (glue con Postgres)
    reservation/     # bookReservation: único punto de escritura, transaccional, best-fit + retry de deadlocks
                      # status-machine.ts: transiciones válidas de estado de una reserva
                      # notification-email.ts / ics.ts: contenido de los emails y el adjunto .ics
    email/           # Interfaz EmailSender (attachments incluidos; console-sender.ts local, resend-sender.ts prod)
    auth/            # signed-token.ts (HMAC compartido) · session.ts (staff) · diner-session.ts · magic-link.ts · require-staff.ts
    i18n/            # Copy ES/EN + interpolate() para templates con {variables}
    validation/      # Schemas zod compartidos (admin.ts, auth.ts, booking.ts, phone.ts, onboarding.ts)
  jobs/
    worker.ts        # Proceso pg-boss aparte (`pnpm worker`): manda confirmación/recordatorio por email + revisa la lista de espera
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
- **Notificaciones:** `notification` es la fuente de verdad (`scheduled → sent/failed`, con `attempts` para acotar reintentos); el worker de pg-boss es "solo" el proceso que la vacía cada 1 minuto, no dueño del estado. Esto mantiene la lógica de negocio (cuándo cancelar un recordatorio, cuándo agendar uno nuevo) en el mismo lugar que el resto del dominio (`src/db/`), no dispersa en callbacks de la cola.
- **Branding por tenant:** `restaurant.settings.accentColor` pisa el acento en `/r/{slug}` (ver `src/app/r/[slug]/page.tsx`). Los tokens derivados del acento (`--accent-subtle`, `--ring`, etc.) usan `color-mix()` — y como `color-mix()` se resuelve en el punto donde CADA custom property se declara (no se "recalcula en cascada" al pisar solo `--accent` en un elemento anidado), hay que redeclarar todos los derivados juntos con el color literal del tenant, no alcanza con pisar `--accent` sola.
