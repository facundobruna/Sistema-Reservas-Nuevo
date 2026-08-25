# Sistema de Reservas — Ingeniería del Software 3

El sistema de reservas más rápido y sin fricción del mercado: gestión de reservas para restaurantes, y nada más. Ver [prompt-maestro-desde-cero.md](./prompt-maestro-desde-cero.md) (fuente de verdad del producto) y [plan.md](./plan.md) (hoja de ruta de construcción).

## Stack

Node.js 22+ · TypeScript · Next.js 16 (App Router) · PostgreSQL 17 · Drizzle ORM · pg-boss · Mercado Pago (SDK oficial) · Luxon · Tailwind CSS 4 · Zod · React Query · pnpm.

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

# 8. (Opcional) Crear una cuenta de superadmin para /superadmin
pnpm superadmin:create -- --email=vos@ejemplo.com --password=algo-seguro --name="Tu nombre"
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
- **Suscripción:** `active` directo (no `trialing`) — el demo anda siempre en local sin depender de Mercado Pago

## Alta de un restaurante nuevo (self-serve)

`/onboarding` — wizard público de 3 pasos (restaurante + link/timezone → cuenta del owner → turnos típicos de almuerzo/cena). Al confirmar crea el restaurante, una zona "Salón principal", los turnos elegidos (abiertos los 7 días, editables después) y el owner, todo en una transacción; abre sesión automáticamente y redirige directo a "Compartí tu reserva". Deliberadamente **no** pide mesas en el alta (para que sea rápida) — el panel avisa en la Agenda si todavía no hay ninguna cargada, porque sin mesas el motor no tiene nada que ofrecer.

## Panel del restaurante

`/admin/{slug}/login` → panel en `/admin/{slug}`. El login es por restaurante (mismo patrón que `/r/{slug}` del comensal) porque el email de un staff solo es único dentro de su restaurante, no globalmente. La sesión es una cookie httpOnly firmada (HMAC, sin tabla de sesiones ni librería de auth).

La portada del panel es la **Agenda** (`/admin/{slug}`): lista de reservas del día con filtros por fecha/estado/zona, botones de cambio de estado (confirmar → sentar → completar, o cancelar/no-show desde cualquier estado anterior a completar), reasignación de mesa y carga manual de walk-ins/reservas telefónicas. El resto de la configuración (zonas, mesas, combos, servicios, turnos, excepciones) se movió a su propia sección de nav, separada de la operación diaria. Roles `owner`/`manager` pueden editar configuración; `host` opera la agenda.

**Comensales** (`/admin/{slug}/customers`) — búsqueda de clientes por nombre/teléfono/email (con su histórico de visitas y no-shows) y exportación a CSV. **Analíticas** (`/admin/{slug}/stats`) — conteo mínimo de entradas/cumplidas/canceladas/no-show por rango de fechas; deliberadamente no es un BI ni reemplaza el sistema de gestión que ya tiene el restaurante.

### Máquina de estados de una reserva

`pending → confirmed → seated → completed`, con `cancelled`/`no_show` alcanzables desde cualquier estado anterior a `completed` (`src/lib/reservation/status-machine.ts`, transiciones inválidas se rechazan). Cancelar o marcar no-show libera la mesa al toque (borra las filas de `reservation_mesa`, la unidad vuelve a estar disponible); completar/no-show actualizan `visit_count`/`no_show_count` del cliente.

### Mapa de mesas

`/admin/{slug}/timeline` — grilla mesa × hora del día elegido: cada fila es una mesa (agrupadas visualmente por zona), el eje horizontal es la ventana horaria de los turnos que aplican ese día de semana, y cada reserva se dibuja como un bloque en la fila de su mesa (un combo ocupa todas sus mesas, cada una en su propia fila — `reservation_mesa` ya guarda la ocupación a nivel mesa, no hace falta resolver el combo de nuevo). Es solo visualización: para cambiar un estado o reasignar mesa se sigue usando la Agenda, no se duplica esa lógica acá. Además de mirar el salón de un vistazo, desde ahí se puede **bloquear una mesa para ese día puntual** (rota, evento privado) con un motivo opcional, y desbloquearla — bloquear no cancela reservas que ya estén cargadas en esa mesa ese día, solo impide asignarle una nueva.

### Compartí tu reserva

`/admin/{slug}/share` — todo lo necesario para distribuir el link, calculado en el cliente a partir del restaurante (sin backend propio): el link branded `/r/{slug}` copiable, un texto de WhatsApp con el link ya interpolado (para pegar como respuesta automática en WhatsApp Business, más un botón que abre `wa.me` con el mensaje precargado — **no** se integra la Cloud API de Meta ni se arma un bot), un código QR descargable como PNG (generado 100% local con la librería `qrcode`, sin servicios externos) y un snippet de botón embebible (HTML/CSS autocontenido, con el acento del tenant) para pegar en la web propia del restaurante.

## Flujo de reserva del comensal

`/r/{slug}` — wizard de 5-6 pasos (comensales → fecha → horario → zona *solo si hay más de una* → datos → confirmación), con todo el estado en la URL para que atrás/refresh/compartir el link funcionen. Sin login obligatorio: el comensal se linkea/crea por teléfono en el momento de reservar. Conteo de toques medido y documentado en [docs/friction.md](./docs/friction.md) — es un presupuesto, no crece sin discutirlo.

Login opcional por magic link (`/me`, pedís por teléfono, te llega un link por email — en local se ve por consola) para volver a ver tus reservas desde otro dispositivo. No agrega pasos al flujo de reservar. Desde ahí también se puede **cancelar** o **modificar** (comensales/fecha/hora) cualquier reserva confirmada que todavía no pasó.

Si no hay horarios para la fecha/cantidad pedida, el wizard ofrece **anotarse en lista de espera** (con email, a diferencia del resto del flujo donde es opcional — es el único canal por el que se avisa). El worker de notificaciones revisa las entradas cada 1 minuto y, si aparece disponibilidad real para lo que alguien esperaba, le manda un email con el link para reservar — nadie reserva un lugar por otro, gana quien haga clic primero (el motor ya es seguro bajo concurrencia).

## Reglas de reserva online (anticipación, tope de grupo, no-show automático)

Configurables por restaurante desde Configuración, **solo afectan el autoservicio online** (`source: "web"`) — un walk-in o una reserva cargada a mano desde el panel nunca las pasa a revisar, porque ahí ya hay un humano del restaurante decidiendo.

- **Ventana de reserva:** `minAdvanceMinutes` (anticipación mínima) y `maxAdvanceDays` (anticipación máxima, opcional — sin tope si no se configura). Se aplica dos veces: al listar horarios (`GET /api/v1/r/{slug}/availability` filtra los slots fuera de ventana antes de devolverlos) y de nuevo al confirmar la reserva (`POST`/`PATCH` revalidan server-side, nunca confían en que el horario mostrado siga siendo válido unos segundos después).
- **Tope de grupo online:** `maxOnlinePartySize` (opcional) esconde del wizard los tamaños de mesa por encima del tope y, si igual se pide un número más grande a mano, muestra un mensaje invitando a llamar a `largeGroupPhone` en vez de dejar avanzar — reforzado server-side (`party_too_large`, 422) para que no alcance con editar el request.
- **No-show automático:** `autoNoShowMinutes` (opcional, desactivado si no se configura) — el worker, en la misma corrida de cada minuto, revisa las reservas `confirmed` cuyo horario ya pasó hace más de ese margen y las pasa a `no_show` solas, liberando la mesa. Pensado para el caso típico de "no confirmó, no vino, no avisó" sin que el host tenga que estar mirando el reloj.

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

### Confirmar o cancelar por email

El recordatorio incluye un link "confirmo que voy" y, tanto la confirmación como el recordatorio, un link "cancelar mi reserva" — ambos con un token firmado (HMAC, mismo esquema que el resto de la app) que vence 2 horas después del horario de la reserva. Los dos links son deliberadamente distintos en cómo actúan:

- **Confirmar es un `GET`** que ejecuta al toque y redirige a una página de resultado (`/r/{slug}/action-result`) — es seguro porque no es destructivo, en el peor caso alguien lo abre sin querer y la reserva queda marcada como reconfirmada.
- **Cancelar nunca ejecuta en un `GET`.** El link abre una página intermedia (`/r/{slug}/reservations/{id}/cancel`) que muestra el resumen de la reserva y pide un clic explícito en "Sí, cancelar mi reserva", que recién ahí dispara el `POST` real. Es a propósito: clientes de email y escaneres de seguridad (Outlook Safe Links, el proxy de imágenes de Gmail, antivirus corporativos) pre-visitan automáticamente los links de un email apenas llega, y un `GET` que cancelara directo terminaría cancelando reservas solas sin que el comensal haga nada.

Confirmar por email no toca la máquina de estados — la reserva ya nace `confirmed` (flujo cero-fricción, sin aprobación manual), así que "confirmar" acá es una señal operativa aparte (`confirmedByDinerAt`) para que el restaurante sepa que el comensal reconfirmó que viene. La Agenda muestra un badge "Reconfirmó" junto al estado cuando está presente.

### Avisos al restaurante (reserva nueva / cancelación)

Cuando el **comensal** reserva o cancela por su cuenta, se agenda un email al restaurante (tipos `staff_new`/`staff_cancelled` en `notification`, misma cola y reintentos que confirmación/recordatorio). Va a `settings.notifyEmail` si está configurado en Configuración, y si no al email del `owner` (siempre existe, es obligatorio). Deliberadamente **no** se dispara en walk-ins ni reservas cargadas a mano desde el panel — ahí el staff ya sabe, lo hizo él mismo — ni tampoco al modificar una reserva (por dentro es "cancelar la vieja + reservar la nueva", pero avisar cancelación+nueva por lo que en realidad es una edición sería más confuso que útil; queda fuera de esta vuelta a propósito).

### Feed de calendario del restaurante

`/api/v1/r/{slug}/calendar.ics?token=...` — para suscribirse desde Google Calendar/Outlook/Apple Calendar y ver de un vistazo las reservas del restaurante (3 días atrás a 60 días adelante, sin canceladas/no-show). Es una ruta pública — la consultan directo los servidores del cliente de calendario, sin sesión — autenticada con un token firmado igual que los links de confirmar/cancelar, pero de vencimiento muy largo (pensado para durar suscripto indefinidamente). El link vive en Configuración → Calendario, con un botón para copiarlo y otro para **regenerarlo** (invalida el anterior al toque, subiendo `settings.calendarTokenVersion` — no hace falta rotar el secreto HMAC entero para invalidar un solo link).

## Facturación (Mercado Pago) y superadmin

El pago es **siempre del restaurante hacia la plataforma** (suscripción B2B por usar el software) — no hay ningún flujo de pago del lado del comensal, eso sigue prohibido.

- **Alta:** el onboarding crea la `subscription` en `trialing` con 14 días gratis, en la misma transacción que el resto del alta — el trial no le agrega ningún paso.
- **Panel bloqueado si no paga:** al vencer el trial sin suscribirse, o si el pago queda `past_due`/`canceled`, el layout protegido del panel (`(protected)/layout.tsx`) redirige a `/admin/{slug}/billing` en vez de la Agenda. El flujo del comensal (`/r/{slug}` y sus APIs) **nunca** pasa por este chequeo, en ningún código path — es innegociable según la spec.
- **Suscribirse:** desde `/admin/{slug}/billing`, un owner/manager crea una suscripción (Preapproval de Mercado Pago, un plan mensual fijo) y se lo redirige a la página de Mercado Pago para autorizarla.
- **Sincronización de estado:** doble camino, nunca se confía en el body de un webhook sin re-consultar — `POST /api/v1/webhooks/mercadopago` (valida la firma con el SDK oficial de MP, re-consulta el preapproval real antes de tocar la base) **+** el worker, que además de notificaciones/waitlist corre una reconciliación diaria (`0 3 * * *`) re-consultando cada suscripción con preapproval contra la API de MP. Esto último es lo que permite probar la sincronización en local, ya que un webhook de Mercado Pago no puede alcanzar `localhost`.
- **Para probar un checkout real** hace falta un access token de sandbox de Mercado Pago en `MP_ACCESS_TOKEN` (y `MP_WEBHOOK_SECRET` para el webhook) — sin eso, todo lo demás (gating, superadmin, auditoría) funciona igual, pero crear una suscripción real falla con un error claro en vez de romper el panel.

**Superadmin** (`/superadmin`, sesión propia — cookie separada de `staff_session`, sin alta pública, se crea con `pnpm superadmin:create`):

- Lista de tenants con estado de suscripción + métricas (`MRR` = suscripciones activas × precio, altas y cancelaciones por rango de fechas — un snapshot simple, no un BI).
- Suspender/reactivar un restaurante (independiente de si está al día con el pago — puede ser por cualquier motivo).
- Impersonar: reutiliza la sesión de staff normal (marcada con `impersonatedBy`), no un mecanismo aparte. El panel muestra un banner mientras dura, con un botón para salir.
- Feature flags por tenant, genérico (`restaurant.settings.featureFlags`) — esta pasada entrega la herramienta, hoy no hay ninguna feature del producto que la use.
- Toda acción de superadmin (suspender, reactivar, impersonar, tocar un flag) queda en `audit_log`.

## Detalles del motor: medianoche, buffer y overbooking

Tres ajustes finos a `computeAvailability`, siempre como lógica pura y testeada (`tests/unit/compute-availability.test.ts`):

- **Turnos que cruzan medianoche:** si `endTime <= startTime` al configurar un turno (ej. 22:00–02:00), ya no es inválido — significa "termina al día siguiente". `dayOfWeek` sigue anclado al día en que el turno *arranca* (un turno de "viernes a la noche" se carga con `dayOfWeek=viernes`, aunque parte de sus horarios caigan en la madrugada del sábado). La UI de Turnos avisa con un badge cuando un turno cruza medianoche.
- **Buffer entre sentadas:** `bufferMin` por turno — minutos mínimos entre que una reserva termina en una mesa y la siguiente puede empezar ahí. No es parte del `EXCLUDE` de Postgres (es una regla del motor, no de la base): `resolveSlot` filtra las unidades candidatas por el buffer antes de pasárselas a `bookReservation`, para que lo que se ofrece como disponible y lo que realmente se puede reservar coincidan.
- **Overbooking controlado:** `overbookingPercent` por turno — relaja el *tope de cubiertos* (`pacing_cap`) un %, apostando a que no todos se presentan. Nunca toca la asignación de mesas: si no hay una físicamente libre, el horario no aparece por más margen de overbooking que haya. El `sin_solape` sigue siendo absoluto.

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
| `pnpm superadmin:create -- --email= --password= --name=` | Crea una cuenta de superadmin (sin alta pública) |

## Estructura

```
src/
  app/            # Next.js App Router
  db/
    schema.ts       # Esquema completo en Drizzle (enums + 19 tablas)
    migrations/      # SQL: extensiones, tablas, constraint sin_solape (EXCLUDE)
    client.ts        # Cliente Drizzle (pg Pool)
    migrate.ts        # Corredor de migraciones
    seed.ts           # Seed de demo
    mesa.ts            # createMesa/updateMesa/deleteMesa: mantienen su seating_unit 'single' en sincro
    mesa-block.ts      # createMesaBlock/deleteMesaBlock: bloquear/desbloquear una mesa física para una fecha
    timeline.ts        # getTimeline: ocupación por mesa + bloqueos de un día, para la grilla del panel
    seating-unit.ts   # createCombo/updateCombo: seating_unit 'combo' + sus mesas enlazadas
    restaurant.ts     # getRestaurantBySlug
    onboarding.ts     # createRestaurantOnboarding: alta self-serve (restaurant + zona + turnos + owner) en una transacción
    notification.ts   # scheduleReservationNotifications + scheduleStaffAlert + findDue/markSent/markSkipped/recordFailure
    calendar.ts        # getCalendarFeed: reservas activas en ventana rolling, para el feed iCal del restaurante
    waitlist.ts        # joinWaitlist (idempotente) + findActiveWaitingEntries/markNotified/markBooked/expirePast
    subscription.ts    # createTrialSubscription + evaluatePanelAccess (única fuente de verdad del bloqueo)
    audit.ts           # logAudit: toda acción de superadmin
    create-superadmin.ts # Script (`pnpm superadmin:create`): sin alta pública
  app/api/v1/
    auth/staff/        # login (scoped por slug) / logout
    auth/superadmin/    # login / logout (sesión separada de staff)
    admin/             # CRUD REST: zones, mesas, seating-units, services, shifts, exceptions, settings
                        # + reservations (agenda, walk-in, cambio de estado, reasignar mesa), customers (buscar + export CSV), stats
                        # + timeline (ocupación por mesa de un día) + mesa-blocks (bloquear/desbloquear una mesa)
                        # + calendar-token/regenerate (invalida el link del feed iCal) + billing/ (suscripción, checkout)
    onboarding/        # POST público: alta self-serve de restaurante + owner, abre sesión
    superadmin/         # tenants (listar/detalle/suspender/reactivar/impersonar/feature-flags), stats (MRR/altas/churn)
    webhooks/mercadopago/ # Notificaciones de Mercado Pago sobre cambios de estado de una suscripción
  app/admin/[slug]/    # Panel: login público + billing (fuera del gating, para poder pagar) + rutas protegidas
                        # (grupo (protected)): agenda (portada), timeline (mapa de mesas), share, zones, mesas,
                        # seating-units, services, shifts, exceptions, customers, stats, settings — bloqueadas si la
                        # suscripción no está al día
  app/onboarding/      # Wizard público de alta de restaurante (3 pasos)
  app/superadmin/      # login público + dashboard protegido (tenants, métricas, detalle de tenant)
  app/api/v1/r/[slug]/             # GET público (info) · availability/ · reservations/ (+[id], modificar/cancelar) ·
                                    # waitlist/ · calendar.ics (feed de calendario del restaurante, token en la URL)
  app/api/v1/auth/diner/            # magic-link (pedir) · verify (canjear)
  app/api/v1/me/reservations/       # Reservas del comensal logueado (todas las restaurantes)
  app/r/[slug]/                    # Wizard de reserva (el flujo del comensal) + CTA de lista de espera si no hay horarios
  app/me/                          # Login por magic link + lista de reservas, con cancelar/modificar inline
  lib/
    availability/    # computeAvailability + resolveSlot (puros, sin DB) + loadAvailabilityInput (glue con Postgres)
    reservation/     # bookReservation: único punto de escritura, transaccional, best-fit + retry de deadlocks
                      # status-machine.ts: transiciones válidas de estado de una reserva
                      # notification-email.ts / staff-alert-email.ts / ics.ts: contenido de los emails y los .ics
                      # action-token.ts: token firmado de confirmar/cancelar por email, vence con la reserva
                      # calendar-token.ts: token firmado del feed iCal, vencimiento largo + versión para invalidar
    email/           # Interfaz EmailSender (attachments incluidos; console-sender.ts local, resend-sender.ts prod)
    billing/         # mercadopago.ts: checkout, fetch de una suscripción, verificación de firma del webhook
    auth/            # signed-token.ts (HMAC compartido) · session.ts (staff) · diner-session.ts · magic-link.ts
                      # superadmin-session.ts · require-staff.ts · require-superadmin.ts
    i18n/            # Copy ES/EN + interpolate() para templates con {variables}
    validation/      # Schemas zod compartidos (admin.ts, auth.ts, booking.ts, phone.ts, onboarding.ts, superadmin.ts)
  jobs/
    worker.ts        # Proceso pg-boss aparte (`pnpm worker`): confirmación/recordatorio/avisos al staff por email,
                      # lista de espera, no-show automático y reconciliación diaria de suscripciones contra Mercado Pago
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
- **Impersonar sin mecanismo aparte:** el superadmin no tiene una forma especial de "ver como" un restaurante — simplemente abre una `staff_session` normal para el owner de ese tenant, marcada con `impersonatedBy`. Reutiliza el 100% de la autenticación/autorización del panel ya existente en vez de inventar un camino paralelo, que sería más superficie para tener mal.
- **Facturación separada del dominio operativo:** `subscription` es una tabla aparte de `restaurant` a propósito (no columnas sueltas ahí) — billing es un concern de la plataforma, no algo que el restaurante configura. `evaluatePanelAccess()` (`src/db/subscription.ts`) es la única función que decide si el panel se bloquea; se llama una sola vez, desde el layout protegido — nunca desde el lado del comensal.
- **Ambigüedad de fecha en horarios de madrugada:** al permitir turnos que cruzan medianoche apareció un bug real: `bookReservation` inferís la `date` a re-validar a partir del propio instante (`startsAt` en el timezone del restaurante), pero un horario de madrugada puede pertenecer al turno de HOY (uno que arranca temprano) o ser la cola de un turno de AYER que cruzó la medianoche — `dayOfWeek` queda anclado al día en que el turno arranca, no al día calendario del instante. La reserva se probaba contra la fecha equivocada y fallaba con `slot_unavailable` pese a que el horario sí estaba disponible. Se resolvió probando las dos fechas candidatas (la del instante y la anterior) antes de dar por no disponible.
- **Branding por tenant:** `restaurant.settings.accentColor` pisa el acento en `/r/{slug}` (ver `src/app/r/[slug]/page.tsx`). Los tokens derivados del acento (`--accent-subtle`, `--ring`, etc.) usan `color-mix()` — y como `color-mix()` se resuelve en el punto donde CADA custom property se declara (no se "recalcula en cascada" al pisar solo `--accent` en un elemento anidado), hay que redeclarar todos los derivados juntos con el color literal del tenant, no alcanza con pisar `--accent` sola.
- **Bloqueo de mesa, sin tocar el motor puro:** `mesa_block` bloquea una **mesa física** (no una seating unit), para que un combo que la incluya quede inhabilitado automáticamente — el motor ya chequea cada mesa de una unidad una por una. `loadAvailabilityInput` traduce cada bloqueo en una reserva sintética que ocupa esa mesa el día local completo (`partySize:0`, para no distorsionar el pacing); `computeAvailability`/`isUnitFree` no necesitaron ningún cambio, ya sabían tratar "mesa ocupada". Como es una restricción física, no una política de autoservicio, se resuelve en la capa compartida que usan tanto el comensal como `bookReservation` — a diferencia de la ventana de reserva/tope de grupo de M13, que son online-only.
- **Bug real que encontró esta feature — `resolveSlot` no pre-filtraba por ocupación:** antes de M14, `resolveSlot` solo pre-chequeaba `isUnitFree` cuando había `bufferMin > 0`; para el resto confiaba en que el `EXCLUDE` de Postgres (`sin_solape`) rechazara cualquier solapamiento real al intentar el insert. Eso es válido para una reserva real (tiene una fila en `reservation_mesa` que la base puede rechazar), pero un bloqueo de mesa es una ocupación sintética *sin ninguna fila real* — no hay ningún constraint que lo capture, así que `bookReservation` terminaba sentando una reserva nueva en una mesa bloqueada. Se corrigió haciendo que `resolveSlot` filtre siempre por `isUnitFree` antes de devolver las unidades candidatas. No afecta la garantía de concurrencia (el test de la unidad en disputa sigue pasando): el filtro usa una foto de `activeReservations` leída en ese instante, así que dos requests concurrentes por la misma mesa real siguen viéndola libre en su foto y siguen dependiendo del `EXCLUDE` de la base para desempatar — el pre-filtro solo evita intentar una unidad obviamente tomada (incluidos los bloqueos, que no tienen otra forma de ser detectados).
- **Avisos al staff, mismo motor que confirmación/recordatorio:** `staff_new`/`staff_cancelled` son dos tipos más de `notification`, no un sistema aparte — se agendan para "ahora" (igual que la confirmación) y el worker los procesa en la misma pasada, con los mismos reintentos/`failed`. Se agendan desde los route handlers del comensal (POST reservar, los dos caminos de cancelar), nunca desde `bookReservation`/`cancelReservation` — esas funciones no saben ni les importa quién las llamó, la decisión de "esto amerita avisarle al restaurante" es del caller, no del motor de reservas.
- **Token del feed de calendario, mismo primitivo que los links de email, pensado para durar:** `encodeSignedToken` exige un `exp` numérico (no hay modo "sin vencimiento"), así que el token del feed iCal usa una fecha 50 años en el futuro en vez de inventar un segundo mecanismo de firma solo para este caso. La invalidación ("regenerar link") no rota el secreto `AUTH_SECRET` (afectaría todos los tokens de la app) ni guarda el token en la base — solo sube `settings.calendarTokenVersion`, incluido en el payload firmado; el feed lo compara contra el valor actual y basta con que no coincida para rechazarlo.
- **Links de acción por email, `GET` seguro vs `POST` destructivo:** confirmar (no destructivo) ejecuta directo en el `GET` del link; cancelar (destructivo) nunca ejecuta en un `GET` — requiere aterrizar en una página intermedia y un clic explícito que dispara el `POST`. La razón concreta es que clientes de email y escaneres de seguridad pre-visitan links automáticamente apenas llega el mail, y eso cancelaría reservas solas si "cancelar" fuera un simple `GET`. El endpoint de cancelar reutiliza 100% `cancelReservation` — ninguna lógica de negocio nueva, solo el camino de entrada cambia.
- **Reglas de reserva online son un filtro de la capa de caller, no del motor:** igual que `isPast`, la ventana de anticipación (`minAdvanceMinutes`/`maxAdvanceDays`) se implementa como un filtro aparte (`src/lib/availability/now-filter.ts`) aplicado sobre el resultado de `computeAvailability`, que sigue sin ningún concepto de "ahora" ni de reglas de negocio por tenant. El tope de grupo (`maxOnlinePartySize`) y la ventana se chequean explícitamente en los route handlers del flujo del comensal (creación y modificación), nunca dentro de `bookReservation` — a diferencia de `isPast`, que sí es universal, estas dos son reglas del autoservicio online exclusivamente, y un walk-in/reserva manual del panel no debe verse limitado por algo que el propio staff está decidiendo a mano.
