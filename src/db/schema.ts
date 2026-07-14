import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Custom column types (no equivalente nativo en drizzle-orm/pg-core)
// ---------------------------------------------------------------------------

const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

// Representa un tstzrange de Postgres como texto (ej. '["2026-07-02 20:00:00+00","2026-07-02 21:30:00+00")').
// El valor real se construye con tstzrange(starts_at, ends_at, '[)') en el momento del insert (ver bookReservation).
const tstzrange = customType<{ data: string }>({
  dataType() {
    return "tstzrange";
  },
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const staffRoleEnum = pgEnum("staff_role", ["owner", "manager", "host"]);
export const seatingKindEnum = pgEnum("seating_kind", ["single", "combo"]);
export const seatingModeEnum = pgEnum("seating_mode", ["rolling", "fixed"]);
export const exceptionKindEnum = pgEnum("exception_kind", ["closed", "special_hours"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
]);
export const reservationSourceEnum = pgEnum("reservation_source", ["web", "whatsapp", "manual"]);
export const notificationTypeEnum = pgEnum("notification_type", ["confirmation", "reminder"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["email", "whatsapp"]);
export const notificationStatusEnum = pgEnum("notification_status", ["scheduled", "sent", "failed"]);
export const waitlistStatusEnum = pgEnum("waitlist_status", ["waiting", "notified", "booked", "expired"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled"]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const restaurant = pgTable("restaurant", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/Argentina/Buenos_Aires"),
  settings: jsonb("settings").notNull().default({}),
  // Suspensión manual del superadmin (abuso, pedido del local, etc.) — independiente
  // de si está al día con el pago, que se rastrea en `subscription`.
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffUser = pgTable(
  "staff_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    email: citext("email").notNull(),
    name: text("name").notNull(),
    role: staffRoleEnum("role").notNull().default("host"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("staff_user_restaurant_id_email_key").on(table.restaurantId, table.email)],
);

export const zone = pgTable(
  "zone",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("zone_restaurant_id_idx").on(table.restaurantId)],
);

export const mesa = pgTable(
  "mesa",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zone.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minCapacity: integer("min_capacity").notNull().default(1),
    maxCapacity: integer("max_capacity").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mesa_restaurant_id_idx").on(table.restaurantId),
    index("mesa_zone_id_idx").on(table.zoneId),
    check("mesa_capacity_check", sql`${table.maxCapacity} >= ${table.minCapacity}`),
  ],
);

// El motor opera SIEMPRE sobre seating_unit. Cada mesa genera una unidad
// 'single'; los combos ('combo') los define el local y enlazan varias mesas.
export const seatingUnit = pgTable(
  "seating_unit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: seatingKindEnum("kind").notNull().default("single"),
    minCapacity: integer("min_capacity").notNull(),
    maxCapacity: integer("max_capacity").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("seating_unit_restaurant_id_idx").on(table.restaurantId),
    check("seating_unit_capacity_check", sql`${table.maxCapacity} >= ${table.minCapacity}`),
  ],
);

export const seatingUnitMesa = pgTable(
  "seating_unit_mesa",
  {
    seatingUnitId: uuid("seating_unit_id")
      .notNull()
      .references(() => seatingUnit.id, { onDelete: "cascade" }),
    mesaId: uuid("mesa_id")
      .notNull()
      .references(() => mesa.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.seatingUnitId, table.mesaId] }),
    index("seating_unit_mesa_mesa_id_idx").on(table.mesaId),
  ],
);

export const service = pgTable(
  "service",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("service_restaurant_id_idx").on(table.restaurantId)],
);

export const shift = pgTable(
  "shift",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id").references(() => zone.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    slotIntervalMin: integer("slot_interval_min").notNull().default(15),
    turnDurationMin: integer("turn_duration_min").notNull().default(90),
    seatingMode: seatingModeEnum("seating_mode").notNull().default("rolling"),
    fixedTimes: time("fixed_times").array(),
    pacingCap: integer("pacing_cap"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("shift_restaurant_id_day_of_week_idx").on(table.restaurantId, table.dayOfWeek),
    index("shift_service_id_idx").on(table.serviceId),
    index("shift_zone_id_idx").on(table.zoneId),
    check("shift_day_of_week_check", sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
    check("shift_time_check", sql`${table.endTime} > ${table.startTime}`),
  ],
);

export const scheduleException = pgTable(
  "schedule_exception",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    kind: exceptionKindEnum("kind").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("schedule_exception_restaurant_id_date_idx").on(table.restaurantId, table.date)],
);

export const customer = pgTable("customer", {
  id: uuid("id").primaryKey().defaultRandom(),
  // E.164, identidad global del comensal (no se scopea por restaurant_id).
  phone: text("phone").notNull().unique(),
  email: citext("email"),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mirada del local sobre el comensal. DELIBERADAMENTE MÍNIMA: solo lo que
// nace de operar la reserva. Sin notas, tags ni VIP (eso sería CRM, va afuera).
export const customerRestaurant = pgTable(
  "customer_restaurant",
  {
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    noShowCount: integer("no_show_count").notNull().default(0),
    visitCount: integer("visit_count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.restaurantId, table.customerId] }),
    index("customer_restaurant_customer_id_idx").on(table.customerId),
  ],
);

export const reservation = pgTable(
  "reservation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => service.id, { onDelete: "set null" }),
    seatingUnitId: uuid("seating_unit_id").references(() => seatingUnit.id, { onDelete: "set null" }),
    zoneId: uuid("zone_id").references(() => zone.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    partySize: integer("party_size").notNull(),
    status: reservationStatusEnum("status").notNull().default("pending"),
    specialRequests: text("special_requests"),
    source: reservationSourceEnum("source").notNull().default("web"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reservation_restaurant_id_starts_at_idx").on(table.restaurantId, table.startsAt),
    index("reservation_restaurant_id_status_idx").on(table.restaurantId, table.status),
    index("reservation_customer_id_idx").on(table.customerId),
    index("reservation_service_id_idx").on(table.serviceId),
    index("reservation_seating_unit_id_idx").on(table.seatingUnitId),
    index("reservation_zone_id_idx").on(table.zoneId),
    check("reservation_ends_at_check", sql`${table.endsAt} > ${table.startsAt}`),
    check("reservation_party_size_check", sql`${table.partySize} > 0`),
  ],
);

// Anti doble-booking. Al cancelar o marcar no_show, BORRAR las filas de esta
// tabla para liberar el inventario (el constraint aplica a toda fila presente).
// El constraint EXCLUDE `sin_solape` se agrega en una migración SQL cruda,
// ya que drizzle-kit no puede expresar EXCLUDE USING gist.
export const reservationMesa = pgTable(
  "reservation_mesa",
  {
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "cascade" }),
    mesaId: uuid("mesa_id")
      .notNull()
      .references(() => mesa.id, { onDelete: "cascade" }),
    periodo: tstzrange("periodo").notNull(),
  },
  (table) => [primaryKey({ columns: [table.reservationId, table.mesaId] })],
);

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    status: notificationStatusEnum("status").notNull().default("scheduled"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notification_reservation_id_idx").on(table.reservationId),
    index("notification_scheduled_for_scheduled_idx")
      .on(table.scheduledFor)
      .where(sql`${table.status} = 'scheduled'`),
  ],
);

// Lista de espera: cuando no hay horarios para una fecha/cantidad, el
// comensal se anota acá. El worker (src/jobs/worker.ts) revisa las entradas
// 'waiting' y avisa por email si aparece disponibilidad — no reserva nada
// por su cuenta, el motor de bookReservation sigue siendo el único árbitro.
export const waitlistEntry = pgTable(
  "waitlist_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    partySize: integer("party_size").notNull(),
    zoneId: uuid("zone_id").references(() => zone.id, { onDelete: "cascade" }),
    status: waitlistStatusEnum("status").notNull().default("waiting"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("waitlist_entry_restaurant_id_date_idx").on(table.restaurantId, table.date),
    index("waitlist_entry_status_idx").on(table.status),
    check("waitlist_entry_party_size_check", sql`${table.partySize} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// SaaS-ops (M11) — separado del dominio operativo del restaurante a propósito:
// facturación de la plataforma y herramientas de superadmin, no algo que un
// restaurante configura o ve desde su panel salvo la propia suscripción.
// ---------------------------------------------------------------------------

// 1:1 con restaurant. El pago es SIEMPRE del restaurante hacia la plataforma
// (suscripción B2B) — no hay ningún flujo de pago del lado del comensal acá.
export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .unique()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    mpPreapprovalId: text("mp_preapproval_id"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("subscription_status_idx").on(table.status)],
);

// Cuenta global, no scoped por restaurant_id (a diferencia de staff_user) — opera
// sobre todos los tenants. Sin alta pública: se crea con `pnpm superadmin:create`.
export const superadminUser = pgTable("superadmin_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Toda acción de superadmin queda registrada acá — "acceso restringido y auditado".
// `action` es texto libre (no enum) para no necesitar una migración cada vez que se
// agrega un tipo de acción nuevo; el conjunto válido se controla desde TypeScript.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    superadminId: uuid("superadmin_id")
      .notNull()
      .references(() => superadminUser.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetRestaurantId: uuid("target_restaurant_id").references(() => restaurant.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_superadmin_id_idx").on(table.superadminId),
    index("audit_log_target_restaurant_id_idx").on(table.targetRestaurantId),
  ],
);
