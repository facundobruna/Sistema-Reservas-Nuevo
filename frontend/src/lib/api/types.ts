/**
 * Formas de los datos que devuelve la API, escritas a mano de este lado.
 *
 * Antes de separar back de front, estos tipos se derivaban del esquema de
 * Drizzle (`typeof zone.$inferSelect`). Eso ataba el frontend a la base: para
 * compilar una pantalla hacía falta el ORM, el esquema y, por transitividad, el
 * driver de Postgres.
 *
 * Al declararlos acá el frontend depende del *contrato HTTP*, no de las tablas.
 * Y el contrato no es idéntico al esquema: lo que viaja es JSON, así que toda
 * columna `timestamp` llega como string ISO, no como `Date`. Los tipos viejos
 * decían `Date` y mentían — el dato ya venía de un `fetch` y en runtime siempre
 * fue un string. Acá quedó corregido.
 */

export type ReservationStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
export type ReservationSource = "web" | "whatsapp" | "manual";
export type SeatingKind = "single" | "combo";
export type SeatingMode = "rolling" | "fixed";
export type ExceptionKind = "closed" | "special_hours";
export type StaffRole = "owner" | "manager" | "host";
export type PanelAccess = "ok" | "trial_expired" | "payment_required" | "suspended";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  settings: unknown;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Zone = {
  id: string;
  restaurantId: string;
  name: string;
  position: number;
  createdAt: string;
};

export type Mesa = {
  id: string;
  restaurantId: string;
  zoneId: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  active: boolean;
  createdAt: string;
};

export type SeatingUnit = {
  id: string;
  restaurantId: string;
  name: string;
  kind: SeatingKind;
  minCapacity: number;
  maxCapacity: number;
  active: boolean;
  createdAt: string;
  mesaIds: string[];
};

export type Service = {
  id: string;
  restaurantId: string;
  name: string;
  position: number;
  createdAt: string;
};

export type Shift = {
  id: string;
  restaurantId: string;
  serviceId: string;
  zoneId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotIntervalMin: number;
  turnDurationMin: number;
  seatingMode: SeatingMode;
  fixedTimes: string[] | null;
  pacingCap: number | null;
  bufferMin: number;
  overbookingPercent: number;
  createdAt: string;
};

export type ScheduleException = {
  id: string;
  restaurantId: string;
  date: string;
  kind: ExceptionKind;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
  createdAt: string;
};

export type Subscription = {
  id: string;
  restaurantId: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  mpPreapprovalId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Respuesta de GET /api/v1/auth/staff/me */
export type StaffSession = {
  staffId: string;
  restaurantId: string;
  restaurantSlug: string;
  role: StaffRole;
  email: string;
  impersonatedBy?: string;
};

/** Respuesta de GET /api/v1/auth/superadmin/me */
export type SuperadminSession = {
  superadminId: string;
  email: string;
};

/** Respuesta de GET /api/v1/r/{slug} — la info pública del flujo de reserva. */
export type PublicRestaurantInfo = {
  slug: string;
  name: string;
  timezone: string;
  settings: {
    accentColor?: string;
    maxOnlinePartySize?: number | null;
    largeGroupPhone?: string;
  };
  zones: { id: string; name: string }[];
  services: { id: string; name: string }[];
};

/** Respuesta de GET /api/v1/admin/panel-access */
export type PanelAccessResponse = {
  restaurant: { id: string; slug: string; name: string };
  subscription: Subscription | null;
  access: PanelAccess;
};
