import { z } from "zod";
import { e164Phone } from "./phone";

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Formato de hora inválido (HH:MM)");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

// --- Zones ---------------------------------------------------------------

export const zoneCreateSchema = z.object({
  name: z.string().trim().min(1),
  position: z.number().int().min(0).optional(),
});
export const zoneUpdateSchema = zoneCreateSchema.partial();

// --- Mesas -----------------------------------------------------------------

export const mesaCreateSchema = z
  .object({
    zoneId: z.string().uuid(),
    name: z.string().trim().min(1),
    minCapacity: z.number().int().min(1).default(1),
    maxCapacity: z.number().int().min(1),
    active: z.boolean().default(true),
  })
  .refine((v) => v.maxCapacity >= v.minCapacity, {
    message: "max_capacity debe ser >= min_capacity",
    path: ["maxCapacity"],
  });

export const mesaUpdateSchema = z
  .object({
    zoneId: z.string().uuid().optional(),
    name: z.string().trim().min(1).optional(),
    minCapacity: z.number().int().min(1).optional(),
    maxCapacity: z.number().int().min(1).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.minCapacity === undefined || v.maxCapacity === undefined || v.maxCapacity >= v.minCapacity, {
    message: "max_capacity debe ser >= min_capacity",
    path: ["maxCapacity"],
  });

// --- Seating units (combos) -------------------------------------------------
// Las unidades 'single' se crean automáticamente al crear una mesa; este
// recurso solo administra combos explícitos (kind='combo').

export const seatingUnitComboCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    minCapacity: z.number().int().min(1),
    maxCapacity: z.number().int().min(1),
    mesaIds: z.array(z.string().uuid()).min(2),
    active: z.boolean().default(true),
  })
  .refine((v) => v.maxCapacity >= v.minCapacity, {
    message: "max_capacity debe ser >= min_capacity",
    path: ["maxCapacity"],
  });

export const seatingUnitComboUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    minCapacity: z.number().int().min(1).optional(),
    maxCapacity: z.number().int().min(1).optional(),
    mesaIds: z.array(z.string().uuid()).min(2).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.minCapacity === undefined || v.maxCapacity === undefined || v.maxCapacity >= v.minCapacity, {
    message: "max_capacity debe ser >= min_capacity",
    path: ["maxCapacity"],
  });

// --- Services ----------------------------------------------------------------

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1),
  position: z.number().int().min(0).optional(),
});
export const serviceUpdateSchema = serviceCreateSchema.partial();

// --- Shifts ------------------------------------------------------------------

const shiftBase = z.object({
  serviceId: z.string().uuid(),
  zoneId: z.string().uuid().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeString,
  endTime: timeString,
  slotIntervalMin: z.number().int().min(1).default(15),
  turnDurationMin: z.number().int().min(1).default(90),
  seatingMode: z.enum(["rolling", "fixed"]).default("rolling"),
  fixedTimes: z.array(timeString).optional(),
  pacingCap: z.number().int().min(0).nullable().optional(),
  // Minutos de limpieza entre una reserva y la siguiente en la misma mesa.
  bufferMin: z.number().int().min(0).default(0),
  // % en que se puede superar pacing_cap (apostando a no-shows) — nunca afecta la
  // asignación de mesas, solo el tope de cubiertos.
  overbookingPercent: z.number().int().min(0).max(100).default(0),
});

// end_time <= start_time significa "cruza medianoche" (ej. 22:00–02:00), ya no es
// inválido — solo se prohíbe la duración cero (end_time === start_time).
function refineShift<T extends z.infer<typeof shiftBase>>(v: T) {
  return v.endTime !== v.startTime && (v.seatingMode !== "fixed" || (v.fixedTimes?.length ?? 0) > 0);
}

export const shiftCreateSchema = shiftBase.refine(refineShift, {
  message: "end_time no puede ser igual a start_time, y el modo fixed requiere fixed_times",
});

export const shiftUpdateSchema = shiftBase.partial().refine((v) => {
  if (v.startTime && v.endTime && v.endTime === v.startTime) return false;
  if (v.seatingMode === "fixed" && v.fixedTimes !== undefined && v.fixedTimes.length === 0) return false;
  return true;
}, "end_time no puede ser igual a start_time, y el modo fixed requiere fixed_times");

// --- Schedule exceptions -------------------------------------------------------

export const exceptionCreateSchema = z
  .object({
    date: dateString,
    kind: z.enum(["closed", "special_hours"]),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    note: z.string().trim().optional(),
  })
  .refine((v) => v.kind !== "special_hours" || (v.startTime && v.endTime && v.endTime > v.startTime), {
    message: "special_hours requiere start_time y end_time (end_time > start_time)",
  });

export const exceptionUpdateSchema = z
  .object({
    date: dateString.optional(),
    kind: z.enum(["closed", "special_hours"]).optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    note: z.string().trim().optional(),
  })
  .refine((v) => !(v.startTime && v.endTime) || v.endTime > v.startTime, {
    message: "end_time debe ser > start_time",
  });

// --- Settings ------------------------------------------------------------------

export const settingsUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  timezone: z.string().trim().min(1).optional(),
  settings: z
    .object({
      reminderHoursBefore: z.number().min(0).max(72).optional(),
      accentColor: z.string().trim().optional(),
      // Ventana de reserva del autoservicio online — no aplica a lo que carga el staff a mano.
      minAdvanceMinutes: z.number().int().min(0).max(10080).optional(),
      maxAdvanceDays: z.number().int().min(1).max(365).nullable().optional(),
      // Tope de grupo online + a quién llamar si te pasás.
      maxOnlinePartySize: z.number().int().min(1).nullable().optional(),
      largeGroupPhone: z.string().trim().max(40).optional(),
      // No-show automático. null/undefined = desactivado.
      autoNoShowMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    })
    .partial()
    .optional(),
});

// --- Reservations (agenda) -----------------------------------------------------

export const reservationListQuerySchema = z.object({
  date: dateString.optional(),
  status: z.enum(["pending", "confirmed", "seated", "completed", "cancelled", "no_show"]).optional(),
  zoneId: z.string().uuid().optional(),
});

export const reservationCreateSchema = z.object({
  startsAt: z.string().datetime(),
  partySize: z.number().int().min(1),
  zoneId: z.string().uuid().optional(),
  specialRequests: z.string().trim().max(500).optional(),
  seated: z.boolean().optional(),
  customer: z.object({
    phone: e164Phone,
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().optional(),
  }),
});

export const reservationUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "seated", "completed", "cancelled", "no_show"]).optional(),
  seatingUnitId: z.string().uuid().optional(),
  specialRequests: z.string().trim().max(500).optional(),
});

// --- Customers (mínimo) ---------------------------------------------------------

export const customerSearchQuerySchema = z.object({
  search: z.string().trim().optional(),
});

// --- Stats mínimo ------------------------------------------------------------

export const statsQuerySchema = z.object({
  from: dateString,
  to: dateString,
});

// --- Timeline (mesa x hora) + bloqueo de mesa por fecha -----------------------

export const timelineQuerySchema = z.object({
  date: dateString,
});

export const mesaBlockCreateSchema = z.object({
  mesaId: z.string().uuid(),
  date: dateString,
  note: z.string().trim().max(200).optional(),
});
