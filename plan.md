# Plan de construcción — SaaS de reservas para restaurantes

> Hoja de ruta detallada del proyecto, derivada de [prompt-maestro-desde-cero.md](prompt-maestro-desde-cero.md) (la fuente de verdad). Se trabaja **un milestone a la vez**: antes de empezar cada uno se presenta el plan puntual y se espera el OK; al terminarlo se muestra lo construido y se espera el OK para seguir.

---

## 1. Visión y principios rectores

**Qué es:** el sistema de reservas más rápido y sin fricción del mercado. Hace una sola cosa —gestión de reservas— excepcionalmente bien. No es marketplace, no es POS, no es CRM.

**Para quién:** restaurantes que ya tienen audiencia propia (Instagram, WhatsApp) y hoy gestionan reservas a mano. Somos la **capa de conversión** sobre esa audiencia: el local ya tiene la gente, nosotros la convertimos en reservas.

**Principio de alcance (filtro de toda decisión):** del lado del restaurante, solo lo mínimo indispensable para operar reservas. Ante la duda: si el sistema de gestión que el local ya usa lo hace o debería hacerlo, **va afuera**.

- **Adentro:** agenda de reservas y estados · configuración de disponibilidad (mesas, zonas, turnos, cupos) · distribución (link, QR, texto WhatsApp, botón) · contador de no-show · contacto del comensal exportable · analytics mínimo (reservas entradas vs. cumplidas por período).
- **Afuera:** CRM (notas, tags, VIP, historial rico) · BI (ocupación, picos, segmentación) · cualquier operación del local que no sea la reserva.

**Métrica norte:** tiempo y cantidad de toques hasta confirmar una reserva. Todo cambio de UI que suba los toques se discute antes de entrar. El conteo se mide y se documenta en el repo.

**Regla del comensal:** cero login obligatorio, cero DNI, cero seña, cero app. Tres toques y listo.

---

## 2. Decisiones técnicas

### Stack (última estable de cada major al momento de instalar)

| Pieza | Elección | Nota |
|---|---|---|
| Runtime | Node.js 22 LTS · TypeScript 5.x | strict |
| Framework | `next` 16.x (App Router) · `react` 19.x | Next 16: request APIs **async** (`await cookies()`, `await params`) |
| Base de datos | **PostgreSQL 17** | elección central: transacciones + exclusion constraints |
| ORM | `drizzle-orm` 0.45.x + `drizzle-kit` | índices/checks como **array desde el callback**; `tstzrange` y `EXCLUDE` van por **migración SQL cruda** |
| Driver / jobs | `pg` 8.x · `pg-boss` (sobre el mismo Postgres) | sin Redis ni broker extra |
| Fechas | `luxon` 3.x | toda hora local se calcula en el `timezone` del restaurante |
| Data fetching | `@tanstack/react-query` 5.x | |
| Estilos | `tailwindcss` 4.x | config **CSS-first** (`@tailwindcss/postcss`), sin `tailwind.config.js` |
| Validación | `zod` 4.x | todo input validado **server-side** |
| UI | `shadcn/ui` vía CLI | restyleado hasta que no se reconozca (ver M2) |
| Email | interfaz `EmailSender` | consola en local · Resend/Postmark en prod |
| Auth | comensal passwordless (magic link) · staff con login propio | sesiones propias con cookies httpOnly; password con hash argon2/bcrypt; sin librería de auth pesada |

### Defaults elegidos (triviales y reversibles — avisados acá)

- **pnpm** como gestor de paquetes.
- **Docker Compose** para Postgres local (imagen oficial 17; `pgcrypto`, `btree_gist` y `citext` se crean por migración).
- **Vitest** para tests: unit (motor puro, sin DB) + integración (concurrencia y API contra Postgres real).
- Secrets por variables de entorno con `.env.example` completo.

### Convenciones

- **Multi-tenant:** `restaurant_id` en toda query de negocio, sin excepción. Jamás cruzar datos entre tenants.
- Identificadores de tablas/columnas como en el esquema de la spec (mezcla inglés + `mesa`, `periodo`, `sin_solape`). **No traducir.**
- Copy de UI en ES/EN vía i18n.
- El motor de disponibilidad opera **siempre** sobre `seating_unit` (cada mesa genera su unidad `single`; los combos enlazan varias mesas).

---

## 3. Estructura de carpetas propuesta

```
src/
  app/
    (public)/
      r/[slug]/                # flujo de reserva del comensal (wizard, estado en URL)
      style-guide/             # design system interno
    admin/                     # panel staff: config, agenda, comensales, stats, compartir
    api/v1/                    # REST: booking público, auth, admin
  db/
    schema.ts                  # tablas Drizzle
    migrations/                # SQL cruda: extensiones, enums, EXCLUDE sin_solape, índices
    seed.ts                    # demo: restaurante + zonas + mesas + combos + servicios + turnos
  lib/
    availability/              # computeAvailability (pura) + bookReservation (transaccional)
    email/                     # EmailSender (consola / Resend)
    auth/                      # sesiones staff + magic link comensal
    i18n/                      # ES/EN
    validation/                # zod schemas compartidos API/forms
  jobs/                        # pg-boss: confirmación + recordatorio
tests/
  unit/                        # motor puro (los 7 casos obligatorios)
  integration/                 # concurrencia sobre la última mesa, API
docker-compose.yml · .env.example · README.md
```

---

## 4. Milestones

Cierre de **cada** milestone: compila, tests verdes, ninguna pantalla parece template, commit limpio, y PARAR a esperar el OK.

### M1 — Bootstrap

**Objetivo:** proyecto levantable con un comando, esquema completo migrado y seed de demo.

- Scaffold Next 16 (App Router) + TS strict + Tailwind 4 CSS-first + pnpm.
- `docker-compose.yml` con Postgres 17; `.env.example` con todos los secrets.
- Esquema completo en Drizzle (`schema.ts`): los 9 enums y las 14 tablas de la spec, checks incluidos.
- Migración SQL cruda: `CREATE EXTENSION pgcrypto/btree_gist/citext`, enums, y el constraint `sin_solape EXCLUDE USING gist (mesa_id WITH =, periodo WITH &&)` sobre `reservation_mesa`.
- Índices: `reservation(restaurant_id, starts_at)`, `reservation(restaurant_id, status)`, FKs, y parcial `notification(scheduled_for) WHERE status='scheduled'`.
- Lógica de dominio: al crear una `mesa`, crear en la misma transacción su `seating_unit` `single` + fila en `seating_unit_mesa`.
- Seed de demo: 1 restaurante (timezone Buenos Aires) con 2 zonas, ~8 mesas de capacidades variadas, 1–2 combos, 2 servicios (almuerzo/cena), turnos rolling y fixed, 1 excepción de ejemplo, 1 staff owner.
- `README.md` con pasos exactos: un comando para levantar todo + migrar + seedear.

**Done:** `docker compose up` → migrate → seed → `pnpm dev` andando de cero en una máquina limpia siguiendo solo el README.

### M2 — Design system + `/style-guide`

**Objetivo:** dirección estética comprometida (hospitalidad refinada/editorial) ejecutada con precisión. La UI es el producto.

- Tokens por CSS variables: paleta cohesiva, acento configurable por tenant, dark mode diseñado (no invertido).
- Pareja tipográfica: display con carácter + texto refinada, escala jerárquica real. **Prohibido:** Inter/Roboto/system/Space Grotesk.
- Restylear shadcn/ui hasta que no se reconozca (radios, sombras, spacing, estados focus).
- Un solo set de iconos (Lucide o Phosphor — elegir uno y no mezclar).
- Base i18n ES/EN.
- Patrones de estado: skeletons que calcan el layout, vacíos con acción, errores humanos.
- Página interna `/style-guide` que documenta todo (tokens, tipografía, componentes, estados).

**Prohibiciones permanentes:** gradiente violeta/azul sobre blanco · hero centrado con blob + emoji + pill · tres cards con icono-en-círculo · emojis como iconos · lorem ipsum · sombras en todo.

**Done:** `/style-guide` completa; la prueba: ¿un restaurante de alta gama lo mostraría sin vergüenza?

### M3 — Configuración del panel + auth staff

**Objetivo:** un restaurante se configura entero desde el panel.

- Auth staff: `POST /auth/staff/login` / `logout`, sesiones httpOnly, roles `owner`/`manager`/`host`.
- CRUD `/admin/zones`, `/admin/mesas` (dispara auto-unidad single), `/admin/seating-units` (combos que enlazan mesas), `/admin/services`, `/admin/shifts`, `/admin/exceptions`, `/admin/settings`.
- Turnos: día de semana, horario, `slot_interval_min`, `turn_duration_min`, modo `rolling`/`fixed` (con `fixed_times`), `pacing_cap`, zona opcional.
- Excepciones: `closed` o `special_hours` por fecha.
- Todo validado con zod server-side; todo scoped por `restaurant_id`.

**Done:** desde el panel se arma la configuración completa que el motor necesita en M4.

### M4 — Motor de disponibilidad (el corazón)

**Objetivo:** `computeAvailability` como **función pura** (sin DB), testeada a fondo. Prioridad máxima del proyecto.

Entrada: `{ date, partySize, zoneId? }` + shifts del día + seating_units activas (con mesas y capacidades) + reservas activas del día (estado ≠ `cancelled`/`no_show`, con mesas y rangos) + `timezone` + excepción del día.

Algoritmo (según spec):
1. Excepción `closed` → `[]`.
2. Filtrar unidades que entran para `partySize` (y `zoneId` si se pidió).
3. Por cada shift (saltear si se pidió zona y el shift es de otra): aplicar `special_hours`; generar candidatos — `rolling`: de `start_time` a `end_time − turn_duration_min` con paso `slot_interval_min`; `fixed`: los `fixed_times` en ventana — cada hora local calculada en el `timezone` con Luxon. Por candidato (`end = start + turn_duration_min`):
   - **Pacing:** si `pacing_cap` no es null, sumar `party_size` de reservas con `starts_at` en `[start, start + slot_interval_min)`; si + `partySize` supera el cap → descartar.
   - **Mesa:** unidad libre que entre (todas sus mesas sin solape: `start < r.ends_at && r.starts_at < end`), **best-fit** (menor `max_capacity` primero).
4. Devolver ordenados y deduplicados.

Detalle clave: el `periodo` es semiabierto `[)` — dos sentadas que se tocan en el borde (20:00–21:30 y 21:30–23:00) **no** solapan.

- Endpoint `GET /api/v1/r/{slug}/availability?date=&partySize=&zoneId=` → `{ slots: [{ time, serviceId }] }`.

**Done (tests obligatorios, Vitest):** día cerrado · sin mesas que entren · solapamiento exacto · pacing que bloquea aunque haya mesas · best-fit · combos · modo fixed. (El de concurrencia va en M5.)

### M5 — Reserva (`bookReservation` + API)

**Objetivo:** crear reservas sin doble-booking, ni bajo concurrencia.

- `bookReservation` (único punto con concurrencia): recalcular disponibilidad server-side; por cada unidad candidata en orden best-fit, **transacción** que inserta `reservation` + una fila en `reservation_mesa` por mesa con `periodo = tstzrange(starts_at, ends_at, '[)')`. Si el constraint `sin_solape` falla (`23P01`) → rollback y probar la siguiente unidad. Ninguna entra → `sin_disponibilidad` (API: `409 slot_unavailable`).
- `POST /api/v1/r/{slug}/reservations`: linkea/crea `customer` por teléfono (E.164, identidad global), corre `bookReservation`, agenda confirmación + recordatorio en `notification` (envío real en M9), abre sesión de comensal → `dinerToken`. `201` o `409`. **Nunca confiar en horario/mesa del cliente: revalidar siempre.**
- `GET/PATCH /api/v1/r/{slug}/reservations/{id}`: ver, editar `special_requests`, cancelar. Cancelar → **borrar** filas de `reservation_mesa` (libera inventario).
- `GET /api/v1/r/{slug}` → info pública (zonas, servicios, branding, ventana de reserva).

**Done:** test de integración de concurrencia — N reservas en paralelo sobre la última mesa disponible, **solo una gana**, el resto recibe 409.

### M6 — Flujo de reserva del comensal (lo más importante)

**Objetivo:** el flujo de reserva más rápido posible, medido.

- Wizard: comensales → fecha → horario → zona (**solo si hay más de una**) → datos mínimos (nombre, email, teléfono) → confirmación.
- Cuenta passwordless creada en segundo plano; login por magic link **opcional**, solo útil para recurrentes (`POST /auth/diner/magic-link`, `/verify`, `GET /me/reservations`).
- Estado del wizard **en la URL** (paso + selecciones): atrás/refresh/compartir link funcionan.
- Mobile-first real; todos los estados diseñados (carga, vacío, error, éxito); feedback instantáneo (optimistic UI donde aplique con React Query).
- i18n ES/EN; branding por tenant (acento, nombre, foto).
- Accesibilidad AA en todo el flujo.

**Done:** conteo de toques y tiempo hasta confirmar **medido y documentado** en el repo (ej. `docs/friction.md`). Ese número queda como presupuesto: no crece sin discusión.

### M7 — Agenda del panel + comensales mínimo + analytics mínimo

**Objetivo:** el staff opera el día a día de reservas, y nada más.

- Agenda: `GET /admin/reservations?date=&status=&zoneId=` (vista por día), detalle, `POST /admin/reservations` (walk-in/manual, source `manual`), `PATCH` (cambio de estado + reasignación de mesa/unidad).
- Máquina de estados validada: `pending → confirmed → seated → completed`, con `cancelled`/`no_show` desde estados activos. Transiciones inválidas → 422.
- Al pasar a `cancelled`/`no_show`: borrar filas de `reservation_mesa`; actualizar `no_show_count` (no_show) y `visit_count` (completed) en `customer_restaurant`.
- Comensales mínimo: `GET /admin/customers?search=` (nombre, contacto, no-shows, visitas) + `GET /admin/customers/export` (CSV). **Sin notas/tags/VIP.**
- Analytics mínimo: `GET /admin/stats?from=&to=` → entradas, cumplidas, no-show, canceladas. **Nada de ocupación ni segmentación.**

**Done:** un servicio completo se opera desde la agenda; cancelar libera el slot al instante (verificable pidiendo availability).

### M8 — Onboarding self-serve + "Compartí tu reserva"

**Objetivo:** un local se da de alta y queda operativo solo.

- Onboarding: alta de restaurante + owner con defaults inteligentes (timezone, turnos típicos, duración estándar), configuración guiada mínima. Al final, entrega directa de las herramientas de distribución.
- Sección "Compartí tu reserva" en el panel:
  - **Link branded** `/r/[slug]` para el bio de Instagram *(alta prioridad)*.
  - **Texto de auto-respuesta de WhatsApp** listo para pegar en WhatsApp Business, con el link *(alta prioridad)*. **NO** integrar la Cloud API de Meta ni armar bot: WhatsApp solo reparte el link.
  - **Botón embebible** (snippet script/iframe liviano) *(media)*.
  - **QR** del link como imagen descargable *(nice to have — trivial, no dedicarle esfuerzo)*.

**Done:** de cero a link compartible sin intervención nuestra.

### M9 — Notificaciones (worker pg-boss)

**Objetivo:** confirmación y recordatorio reales por email.

- Worker pg-boss sobre el mismo Postgres.
- Al confirmar: confirmación inmediata + recordatorio (default unas horas antes, configurable en `settings`) vía `EmailSender`.
- Estados en `notification`: `scheduled → sent / failed`; reintentos razonables; cancelar reserva cancela el recordatorio pendiente.

**Done:** en local se ven los emails por consola; la tabla `notification` refleja el ciclo completo.

### M10 — Mejoras del booking

- Waitlist para horarios llenos.
- Modificar reserva por el comensal (no solo cancelar): cambio de fecha/hora/comensales re-ejecuta `bookReservation`.
- Adjunto `.ics` en la confirmación.

### M11 — SaaS-ops (separado del panel del restaurante)

- Facturación B2B con Stripe (suscripción de los restaurantes). **Nunca** toca el flujo del comensal; la regla "sin seña" sigue intacta.
- Super-admin: tenants, MRR/altas/churn, suspender/impersonar, feature flags. Acceso restringido y auditado.

### M12 — Detalles del motor (baja prioridad)

- Turnos que cruzan medianoche (hoy el esquema asume `end_time > start_time` del mismo día).
- Overbooking controlado y buffers entre sentadas.

---

## 5. Calidad transversal (aplica a todos los milestones)

- **Motor primero:** la corrección de `computeAvailability`/`bookReservation` es prioridad máxima; es lógica pura, se testea.
- Todo input validado server-side con zod; errores de API consistentes y tipados.
- Accesibilidad AA; responsive diseñado por breakpoint, no "que entre".
- Multi-tenant verificado en cada endpoint nuevo (scoping por `restaurant_id`).
- Checklist de cierre: compila · tests verdes · ninguna pantalla parece template · commit limpio · README al día.

---

## 6. Modo de trabajo

1. **Un milestone a la vez.** Al terminar: PARAR, mostrar resumen de lo construido y decisiones tomadas, esperar OK explícito.
2. Antes de empezar un milestone: plan breve (qué y cómo) → confirmación → recién ahí implementar.
3. Ante ambigüedad o decisión de peso: **preguntar**, no asumir. Solo resolver en solitario lo trivial y reversible, avisando qué se eligió.
4. Commit limpio y todo andando al cerrar cada milestone.

---

## 7. Fuera de alcance (NO construir)

- CRM: notas, tags, VIP, historial rico del comensal.
- BI: analytics de ocupación, horarios pico, segmentación.
- POS / sistema de gestión: pedidos, caja, inventario.
- Marketplace, descubrimiento, reseñas.
- Bot conversacional de WhatsApp / Cloud API de Meta.
- Seña, penalizaciones, validación de identidad/DNI del comensal.
- Turnos que cruzan medianoche (recién en M12).

---

## Definición de "terminado" (global)

- Flujo de reserva: el más rápido posible, toques medidos y documentados, sin login/DNI/seña/app, mobile-first, todos los estados resueltos, **sin doble-booking ni bajo concurrencia**.
- Lado restaurante: mínimo y sin pisar al sistema de gestión.
- Ninguna pantalla parece hecha por IA; design system documentado y consistente.
- El comensal reserva, modifica y cancela; recibe confirmación y recordatorio.
- AA, responsive real, performance cuidada. README levanta todo con un comando + seed.
