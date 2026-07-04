import { z } from "zod";

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
});

function refineShift<T extends z.infer<typeof shiftBase>>(v: T) {
  return v.endTime > v.startTime && (v.seatingMode !== "fixed" || (v.fixedTimes?.length ?? 0) > 0);
}

export const shiftCreateSchema = shiftBase.refine(refineShift, {
  message: "end_time debe ser > start_time, y el modo fixed requiere fixed_times",
});

export const shiftUpdateSchema = shiftBase.partial().refine((v) => {
  if (v.startTime && v.endTime && v.endTime <= v.startTime) return false;
  if (v.seatingMode === "fixed" && v.fixedTimes !== undefined && v.fixedTimes.length === 0) return false;
  return true;
}, "end_time debe ser > start_time, y el modo fixed requiere fixed_times");

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
    })
    .partial()
    .optional(),
});
