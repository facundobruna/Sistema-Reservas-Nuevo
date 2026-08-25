# Prompt maestro — Construcción desde cero

Sos un ingeniero de software senior con fuerte criterio de diseño de producto, trabajando conmigo paso a paso. Vas a construir, desde cero, un SaaS de reservas para restaurantes siguiendo esta especificación. Es la fuente de verdad y reemplaza cualquier instrucción previa.

Leé todo antes de escribir una línea.

---

## Rol y objetivo

Construir **el sistema de reservas más rápido y sin fricción del mercado**, que hace una sola cosa —gestión de reservas— excepcionalmente bien, y nada más. No es un marketplace, no es un sistema de gestión (POS), no es un CRM. Su valor es la fricción cero para el comensal y no pisarle el territorio al sistema que el restaurante ya usa.

---

## Cómo trabajar (meta-instrucciones)

Trabajamos **paso a paso y de forma colaborativa**, no de corrido. Seguí estas reglas:

1. **Un milestone a la vez.** Al terminar cada milestone, PARÁ. Mostrame qué hiciste (resumen de lo construido y decisiones tomadas) y esperá mi OK explícito antes de arrancar el siguiente. No avances por tu cuenta al milestone que sigue.
2. **Ante cualquier ambigüedad o decisión de peso, preguntame** en vez de asumir. Prefiero una pregunta corta a una suposición que después haya que deshacer. Solo resolvé por tu cuenta lo que sea trivial y reversible, y avisame qué elegiste.
3. **Antes de empezar un milestone, contame brevemente tu plan** (qué vas a hacer y cómo) y esperá que lo confirme. Recién ahí lo implementás.
4. Commit limpio y todo andando al cerrar cada milestone.
5. La corrección del motor de disponibilidad es prioridad máxima: es lógica pura, testeala.
6. Secrets por variables de entorno (`.env.example`). `README.md` con pasos exactos para levantar todo. Seed de demo.
7. Mobile-first y accesible en el flujo de reserva.

---

## Posicionamiento (esto guía cada decisión)

**La bandera:** la reserva más rápida y sin fricción que existe. Cero login obligatorio, cero DNI, cero seña, cero app. Tres toques y listo.

**Cliente ideal:** restaurantes que ya tienen audiencia propia (Instagram activo, gente que les escribe por WhatsApp) y hoy gestionan reservas a mano y lo sufren. No resolvemos descubrimiento; resolvemos conversión.

**La idea central:** somos la capa de conversión sobre la audiencia que el restaurante ya tiene. El local ya tiene la gente; nosotros la convertimos en reservas sin fricción.

---

## Principio de alcance (EL más importante — leelo dos veces)

El sistema es **excelente en reservas y SOLO en reservas.** La gran mayoría de los restaurantes ya tiene un sistema de gestión; no queremos chocar ni competir con él. Por eso, del lado del restaurante mostramos y hacemos **lo mínimo indispensable para operar reservas, y nada que huela a gestión, CRM o BI.**

**Adentro** (nace naturalmente de la reserva):
- Agenda de reservas y manejo de su estado.
- Configuración de disponibilidad (mesas, zonas, turnos, cupos).
- Herramientas de distribución (link, QR, texto de WhatsApp, botón).
- Contador de no-show por comensal.
- Contacto del comensal (nombre, email, teléfono), con opción de exportarlo.
- Analytics **mínimo**: cuántas reservas entraron y cuántas se cumplieron por período. Nada más.

**Afuera** (es territorio del sistema de gestión):
- Analytics de ocupación, horarios pico, segmentación de clientes.
- CRM: notas, tags, VIP, historial rico del comensal.
- Cualquier cosa de operación del local que no sea la reserva en sí (pedidos, caja, inventario, etc.).

Ante la duda de si una feature del lado del restaurante entra o no: si el sistema de gestión que el local ya tiene lo hace o debería hacerlo, va afuera.

---

## Stack (versiones al día de hoy; instalá la última estable de cada major)

- Node.js 20 LTS o 22 · TypeScript 5.x
- `next` 16.x (App Router) · `react` / `react-dom` 19.x
- **PostgreSQL** (elección central por transacciones y exclusion constraints)
- `drizzle-orm` 0.45.x (estable) + `drizzle-kit`
- `pg` 8.x · `pg-boss` (jobs, sobre el mismo Postgres) · `luxon` 3.x
- `@tanstack/react-query` 5.x · `tailwindcss` 4.x (config CSS-first, `@tailwindcss/postcss`) · `zod` 4.x
- `shadcn/ui` vía CLI (restyleado, ver Diseño)
- Email detrás de una interfaz `EmailSender` (Resend/Postmark en prod; a consola en local)
- Auth: comensal passwordless (magic link) + staff con login propio

Notas: Next 16 tiene request APIs async; Tailwind v4 no usa `tailwind.config.js`; en Drizzle los índices/checks van como array desde el callback; `tstzrange` y el `EXCLUDE` van por migración SQL cruda.

---

## Convenciones

- Multi-tenant: `restaurant_id` en toda query de negocio; jamás filtrar datos entre tenants.
- Identificadores de tablas/columnas como en el esquema (mezcla inglés + `mesa`, `periodo`, `sin_solape`). No traducir.
- Copy de UI en ES/EN vía i18n. Todo input validado server-side con zod.

---

## Modelo de datos

Implementá este esquema PostgreSQL. Definí las tablas en Drizzle; las extensiones y el `EXCLUDE` van por migración SQL.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TYPE staff_role     AS ENUM ('owner', 'manager', 'host');
CREATE TYPE seating_kind   AS ENUM ('single', 'combo');
CREATE TYPE seating_mode   AS ENUM ('rolling', 'fixed');
CREATE TYPE exception_kind AS ENUM ('closed', 'special_hours');
CREATE TYPE reservation_status AS ENUM
  ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
CREATE TYPE reservation_source AS ENUM ('web', 'whatsapp', 'manual');
CREATE TYPE notification_type    AS ENUM ('confirmation', 'reminder');
CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp');
CREATE TYPE notification_status  AS ENUM ('scheduled', 'sent', 'failed');

CREATE TABLE restaurant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  email citext NOT NULL,
  name text NOT NULL,
  role staff_role NOT NULL DEFAULT 'host',
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, email)
);

CREATE TABLE zone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mesa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES zone(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_capacity int NOT NULL DEFAULT 1,
  max_capacity int NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_capacity >= min_capacity)
);

-- El motor opera SIEMPRE sobre seating_unit. Cada mesa genera una unidad
-- 'single'; los combos ('combo') los define el local y enlazan varias mesas.
CREATE TABLE seating_unit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind seating_kind NOT NULL DEFAULT 'single',
  min_capacity int NOT NULL,
  max_capacity int NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_capacity >= min_capacity)
);

CREATE TABLE seating_unit_mesa (
  seating_unit_id uuid NOT NULL REFERENCES seating_unit(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES mesa(id) ON DELETE CASCADE,
  PRIMARY KEY (seating_unit_id, mesa_id)
);

CREATE TABLE service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shift (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zone(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,   -- 0=domingo .. 6=sábado
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_interval_min int NOT NULL DEFAULT 15,
  turn_duration_min int NOT NULL DEFAULT 90,
  seating_mode seating_mode NOT NULL DEFAULT 'rolling',
  fixed_times time[],
  pacing_cap int,                  -- cubiertos máx por ventana; null = sin tope
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (day_of_week BETWEEN 0 AND 6),
  CHECK (end_time > start_time)
);

CREATE TABLE schedule_exception (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  date date NOT NULL,
  kind exception_kind NOT NULL,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,   -- E.164, identidad global
  email citext,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mirada del local sobre el comensal. DELIBERADAMENTE MÍNIMA: solo lo que
-- nace de operar la reserva. Sin notas, tags ni VIP (eso sería CRM, va afuera).
CREATE TABLE customer_restaurant (
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  no_show_count int NOT NULL DEFAULT 0,
  visit_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, customer_id)
);

CREATE TABLE reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES service(id) ON DELETE SET NULL,
  seating_unit_id uuid REFERENCES seating_unit(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES zone(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  party_size int NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  special_requests text,
  source reservation_source NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (party_size > 0)
);

-- Anti doble-booking. Al cancelar o marcar no_show, BORRAR las filas de esta
-- tabla para liberar el inventario (el constraint aplica a toda fila presente).
CREATE TABLE reservation_mesa (
  reservation_id uuid NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES mesa(id) ON DELETE CASCADE,
  periodo tstzrange NOT NULL,
  PRIMARY KEY (reservation_id, mesa_id),
  CONSTRAINT sin_solape EXCLUDE USING gist (mesa_id WITH =, periodo WITH &&)
);

CREATE TABLE notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'scheduled',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Índices razonables: `reservation(restaurant_id, starts_at)`, `reservation(restaurant_id, status)`, sobre las FKs, y parcial sobre `notification(scheduled_for) WHERE status='scheduled'`. Al crear una `mesa`, creá automáticamente su `seating_unit` `single` y su fila en `seating_unit_mesa`.

---

## Motor de disponibilidad (el corazón — con tests)

Separá lógica pura del acceso a base.

**`computeAvailability`** (función pura, sin DB): recibe `{ date, partySize, zoneId? }`, los `shift` del día de semana, las `seating_unit` activas con sus mesas y capacidades, las reservas activas del día (estado ≠ `cancelled`/`no_show`) con sus mesas y rangos, el `timezone`, y la excepción del día. Devuelve horarios disponibles.

1. Si la excepción es `closed`, `[]`.
2. Unidades que entran para `partySize` (y `zoneId` si se pidió).
3. Por cada `shift` (si se pidió zona y el shift es de otra, saltear): aplicar `special_hours` si hay; generar candidatos (`rolling`: de `start_time` a `end_time − turn_duration_min` paso `slot_interval_min`; `fixed`: los `fixed_times` en ventana), calculando cada hora local en el `timezone` (Luxon). Por cada candidato `start` (con `end = start + turn_duration_min`):
   - **Pacing**: si `pacing_cap` no es null, sumar `party_size` de reservas con `starts_at` en `[start, start + slot_interval_min)`; si + `partySize` supera el cap, descartar.
   - **Mesa**: buscar una unidad libre que entre (todas sus mesas sin solapamiento con reservas: `start < r.ends_at && r.starts_at < end`), best-fit (menor `max_capacity` primero).
   - Si hay unidad libre, el horario está disponible.
4. Devolver ordenados y deduplicados.

**`bookReservation`** (único punto con concurrencia): recalcular disponibilidad; por cada unidad candidata (best-fit), en una transacción insertar la reserva + una fila en `reservation_mesa` por mesa con `periodo = tstzrange(starts_at, ends_at, '[)')`. El constraint `sin_solape` garantiza la no superposición; si falla con código `23P01`, rollback y probar la siguiente unidad. Si ninguna entra, `sin_disponibilidad` (la API responde 409).

Tests obligatorios: día cerrado; sin mesas que entren; solapamiento exacto; pacing que bloquea aunque haya mesas; best-fit; combos; modo fixed; y un test de concurrencia que dispare reservas en paralelo sobre la última mesa y verifique que solo una gana.

Detalle sutil: el `periodo` es semiabierto `'[)'`, para que dos sentadas que se tocan en el borde (20:00–21:30 y 21:30–23:00) NO cuenten como solapadas.

---

## API (REST, base `/api/v1`, todo validado con zod)

**Booking público** (`/r/{slug}`, sin auth):
- `GET /r/{slug}` → info pública (zonas, servicios, branding, ventana de reserva).
- `GET /r/{slug}/availability?date=&partySize=&zoneId=` → `{ slots: [{ time, serviceId }] }`.
- `POST /r/{slug}/reservations` → crea la reserva (linkea/crea `customer` por teléfono, corre `bookReservation`, agenda confirmación + recordatorio, abre sesión de comensal → `dinerToken`). `201` o `409 slot_unavailable`. **Revalidar server-side; nunca confiar en el horario/mesa del cliente.**
- `GET/PATCH /r/{slug}/reservations/{id}` → ver, editar `special_requests`, cancelar.

**Auth**: `POST /auth/diner/magic-link`, `/verify`, `GET /me/reservations`; `POST /auth/staff/login`, `/logout`.

**Panel (staff)** — alcance reducido, solo lo de reservas:
- Config: CRUD de `/admin/zones`, `/admin/mesas`, `/admin/seating-units`, `/admin/services`, `/admin/shifts`, `/admin/exceptions`, `/admin/settings`.
- Agenda: `GET /admin/reservations?date=&status=&zoneId=`, `GET /admin/reservations/{id}`, `POST /admin/reservations` (walk-in/manual), `PATCH /admin/reservations/{id}` (estados + reasignación).
- Comensales (mínimo): `GET /admin/customers?search=` (nombre, contacto, `no_show_count`, visitas), `GET /admin/customers/export` (exportar contactos). **Sin** notas/tags/VIP.
- Analytics mínimo: `GET /admin/stats?from=&to=` → cuántas reservas entraron y cuántas se cumplieron (y no-show/canceladas). Nada de ocupación ni segmentación.

Transiciones validadas contra la máquina `pending → confirmed → seated → completed` + `cancelled`/`no_show`. Cancelar o `no_show` borra las filas de `reservation_mesa` y actualiza `no_show_count`/`visit_count`.

---

## El flujo de reserva del comensal (fricción cero — lo más importante)

Pasos: comensales → fecha → horario → zona (solo si hay más de una) → datos mínimos (nombre, email, teléfono; cuenta passwordless en segundo plano; login opcional solo para recurrentes) → confirmación. Sin DNI, sin seña, sin cuenta obligatoria, sin app. El estado del wizard vive en la URL (paso + selecciones), para que atrás/refresh/links funcionen. Mobile-first real. Todos los estados diseñados (carga, vacío, error, éxito). Feedback instantáneo.

**Métrica norte: tiempo y cantidad de toques hasta confirmar.** Es la vara de toda decisión de UI. Si algo sube los toques, se discute antes de sumarlo. Documentá el conteo y no lo dejes crecer.

---

## Distribución (feature de primera clase)

Todas las vías llevan al mismo flujo. En una sección "Compartí tu reserva" del panel:
- **Link branded** (`/r/[slug]`) para el bio de Instagram. *(Alta prioridad.)*
- **Texto de auto-respuesta de WhatsApp**: el sistema le da al local su link + un **texto listo para pegar** en los mensajes automáticos de su WhatsApp Business. **NO integrar la Cloud API de Meta ni armar un bot.** WhatsApp solo reparte el link; la reserva ocurre en nuestro flujo. *(Alta prioridad.)*
- **Botón "Reservar" embebible** (snippet script/iframe liviano) para la web del local. *(Media.)*
- **QR**: el mismo link como imagen descargable. Trivial (solo el link dibujado), no le dediques esfuerzo más allá de generarlo. *(Nice to have.)*

---

## La UI es el producto

Como la bandera es la fricción cero, la calidad de la UI **es** la ventaja competitiva.

**UX (no negociable):** mínimos pasos; sin callejones sin salida; mobile-first real; rápido con feedback instantáneo; sin jerga ni formularios largos ni cuenta obligatoria; cómodo y amable (copy humano, estados vacíos/error que acompañan).

**No puede parecer hecho por IA.** Prueba: ¿un restaurante de alta gama lo mostraría sin vergüenza? Si una pantalla parece template, se rehace.
- Comprometete con una dirección estética (hospitalidad refinada/editorial) ejecutada con precisión.
- Tipografía: prohibido Inter/Roboto/system y las fuentes de IA quemadas (Space Grotesk). Emparejá display con carácter + texto refinada, con escala jerárquica real.
- Color: prohibido gradiente violeta/azul sobre blanco. Paleta cohesiva por CSS variables; acento por tenant; dark mode diseñado.
- Lo que NUNCA: gradiente violeta; Inter como marca; hero centrado con blob + emoji + pill + headline en gradiente; tres cards con icono-en-círculo; shadcn sin restylear; emojis como iconos; lorem ipsum; sombras en todo.
- Craft: todos los estados (skeletons que calcan el layout, vacíos con acción, errores humanos); microcopy ES/EN; un solo set de iconos (Lucide o Phosphor); fotografía real con tratamiento y fallbacks; restyleá los tokens de shadcn hasta que no se reconozca.
- Accesibilidad AA; responsive diseñado en cada breakpoint.

**Entregable:** design system documentado (tokens) + página `/style-guide` interna.

---

## Notificaciones / jobs

Con `pg-boss`: al confirmar, agendar confirmación (inmediata) y recordatorio (default unas horas antes) por email vía `EmailSender`; registrar en `notification`. El recordatorio reduce no-shows — es parte de que la reserva funcione, no es gestión.

---

## Negocio / operación del SaaS (fase posterior, separado del panel del restaurante)

Estas piezas son para operar el SaaS, no forman parte de la herramienta de reservas del restaurante y no cuentan como "gestión" que le choque:
- **Onboarding self-serve**: el local se da de alta y queda operativo solo, con defaults inteligentes; al final obtiene link/QR/texto de WhatsApp/snippet.
- **Facturación B2B con Mercado Pago** (a los restaurantes; nunca toca el flujo del comensal; la regla "sin seña" del comensal sigue intacta).
- **Super-admin** (para vos): tenants, MRR/altas/churn, suspender/impersonar, feature flags; acceso restringido y auditado.

---

## Plan de construcción (milestones, en orden)

1. **Bootstrap**: Next + Drizzle + Postgres, config, `.env.example`, README, migración inicial (esquema + extensiones + constraint), seed de demo.
2. **Design system** + `/style-guide`.
3. **Configuración del panel** (zonas, mesas con auto-unidad, combos, servicios, turnos, excepciones, settings) + auth staff.
4. **Motor de disponibilidad** + tests + `GET /availability`.
5. **Reserva**: `bookReservation` + `POST /reservations` + agendado de notificaciones + `GET/PATCH`.
6. **Flujo de reserva del comensal** end-to-end (fricción mínima, estados, i18n, branding, responsive; medí los toques).
7. **Agenda del panel** (ver/gestionar, estados, walk-ins) + comensales mínimo (contacto, no-show, export) + analytics mínimo.
8. **Onboarding self-serve** + sección "Compartí tu reserva" (link, texto WhatsApp, QR, snippet).
9. **Notificaciones** (worker pg-boss).
10. **Mejoras del booking** (waitlist, modificar/cancelar, .ics).
11. **SaaS-ops** (facturación Mercado Pago, super-admin).
12. **Detalles del motor** (medianoche, overbooking, buffer) — baja prioridad.

Al cerrar cada milestone: compila, pasan los tests, ninguna pantalla parece template.

---

## Definición de "terminado"

- El flujo de reserva es el más rápido posible: pocos toques (medidos y documentados), sin login/DNI/seña/app, mobile-first, todos los estados resueltos, sin doble-booking ni bajo concurrencia.
- El lado del restaurante es mínimo y no pisa al sistema de gestión: agenda, estados, configuración, distribución, contador de no-show, contacto exportable, y analytics mínimo. Nada de CRM/BI.
- Ninguna pantalla parece hecha por IA; design system documentado y consistente.
- El comensal reserva, modifica y cancela; recibe confirmación y recordatorio.
- AA de accesibilidad, responsive real, performance cuidada. README levanta todo con un comando + seed.

---

## Fuera de alcance (NO construir)

- CRM (notas, tags, VIP, historial rico del comensal) y BI/analytics de ocupación o segmentación.
- Sistema de gestión / POS (pedidos, caja, inventario).
- Marketplace, descubrimiento, reseñas.
- Bot conversacional de WhatsApp / integración con la Cloud API de Meta.
- Seña, penalizaciones o validación de identidad/DNI del comensal.
- Turnos que cruzan medianoche (el esquema asume `end_time > start_time` del mismo día) — sumar recién en el milestone de detalles del motor.
