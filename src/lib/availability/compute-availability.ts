import { DateTime } from "luxon";
import type {
  ActiveReservationInput,
  AvailabilitySlot,
  ComputeAvailabilityInput,
  ScheduleExceptionInput,
  SeatingUnitInput,
  ShiftInput,
} from "./types";

type NormalizedReservation = { mesaIds: string[]; partySize: number; startsAt: DateTime; endsAt: DateTime };

/** Construye el instante local (en `timezone`) de `date` a las `time` ("HH:MM" o "HH:MM:SS"). */
function localDateTime(date: string, time: string, timezone: string): DateTime {
  return DateTime.fromISO(`${date}T${time.slice(0, 5)}`, { zone: timezone });
}

function applyExceptionHours(shift: ShiftInput, exception: ScheduleExceptionInput | null): ShiftInput {
  if (exception?.kind === "special_hours" && exception.startTime && exception.endTime) {
    return { ...shift, startTime: exception.startTime, endTime: exception.endTime };
  }
  return shift;
}

function candidateStarts(shift: ShiftInput, date: string, timezone: string): DateTime[] {
  const windowStart = localDateTime(date, shift.startTime, timezone);
  const windowEnd = localDateTime(date, shift.endTime, timezone);
  const latestStart = windowEnd.minus({ minutes: shift.turnDurationMin });

  if (latestStart < windowStart) return [];

  if (shift.seatingMode === "rolling") {
    const starts: DateTime[] = [];
    for (let cur = windowStart; cur <= latestStart; cur = cur.plus({ minutes: shift.slotIntervalMin })) {
      starts.push(cur);
    }
    return starts;
  }

  return (shift.fixedTimes ?? [])
    .map((t) => localDateTime(date, t, timezone))
    .filter((t) => t >= windowStart && t <= latestStart);
}

function filterEligibleUnits(
  seatingUnits: SeatingUnitInput[],
  partySize: number,
  zoneId?: string,
): SeatingUnitInput[] {
  return seatingUnits
    .filter((u) => partySize >= u.minCapacity && partySize <= u.maxCapacity)
    .filter((u) => !zoneId || u.zoneId === zoneId)
    .sort((a, b) => a.maxCapacity - b.maxCapacity);
}

function normalizeReservations(reservations: ActiveReservationInput[]): NormalizedReservation[] {
  return reservations.map((r) => ({
    mesaIds: r.mesaIds,
    partySize: r.partySize,
    startsAt: DateTime.fromISO(r.startsAt),
    endsAt: DateTime.fromISO(r.endsAt),
  }));
}

function pacingAllows(
  shift: ShiftInput,
  start: DateTime,
  partySize: number,
  reservations: NormalizedReservation[],
): boolean {
  if (shift.pacingCap === null) return true;
  const pacingWindowEnd = start.plus({ minutes: shift.slotIntervalMin });
  const covers = reservations
    .filter((r) => r.startsAt >= start && r.startsAt < pacingWindowEnd)
    .reduce((sum, r) => sum + r.partySize, 0);
  return covers + partySize <= shift.pacingCap;
}

function isUnitFree(
  unit: SeatingUnitInput,
  start: DateTime,
  end: DateTime,
  reservations: NormalizedReservation[],
): boolean {
  return unit.mesaIds.every(
    (mesaId) =>
      !reservations.some((r) => r.mesaIds.includes(mesaId) && start < r.endsAt && r.startsAt < end),
  );
}

function shiftAppliesToZone(shift: ShiftInput, zoneId?: string): boolean {
  return !zoneId || !shift.zoneId || shift.zoneId === zoneId;
}

export function computeAvailability(input: ComputeAvailabilityInput): AvailabilitySlot[] {
  const { date, partySize, zoneId, timezone, shifts, seatingUnits, exception } = input;

  if (exception?.kind === "closed") return [];

  const specDayOfWeek = DateTime.fromISO(date, { zone: timezone }).weekday % 7;
  const eligibleUnits = filterEligibleUnits(seatingUnits, partySize, zoneId);
  if (eligibleUnits.length === 0) return [];

  const reservations = normalizeReservations(input.activeReservations);
  const slots: AvailabilitySlot[] = [];

  for (const shift of shifts) {
    if (shift.dayOfWeek !== specDayOfWeek) continue;
    if (!shiftAppliesToZone(shift, zoneId)) continue;

    const effectiveShift = applyExceptionHours(shift, exception);

    for (const start of candidateStarts(effectiveShift, date, timezone)) {
      const end = start.plus({ minutes: effectiveShift.turnDurationMin });

      if (!pacingAllows(effectiveShift, start, partySize, reservations)) continue;

      const hasFreeUnit = eligibleUnits.some((unit) => isUnitFree(unit, start, end, reservations));
      if (hasFreeUnit) {
        slots.push({ time: start.toUTC().toISO()!, serviceId: shift.serviceId });
      }
    }
  }

  const seen = new Set<string>();
  return slots
    .filter((slot) => {
      const key = `${slot.time}|${slot.serviceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

export type ResolvedSlot = {
  serviceId: string;
  endsAt: string;
  /** Unidades elegibles por capacidad/zona, en orden best-fit. NO están pre-chequeadas
   *  contra solapamiento — bookReservation las prueba una por una y deja que el
   *  constraint `sin_solape` de Postgres sea el árbitro final bajo concurrencia. */
  eligibleUnits: SeatingUnitInput[];
};

/**
 * Re-resuelve un horario puntual (el que mandó el cliente) contra la configuración
 * actual del restaurante: ¿sigue siendo un candidato válido (turno, pacing, día,
 * zona) y quién podría servirlo? No es una simple validación booleana: devuelve
 * las unidades candidatas en orden best-fit para que bookReservation las intente.
 */
export function resolveSlot(
  input: ComputeAvailabilityInput & { startsAt: string },
): ResolvedSlot | null {
  const { date, partySize, zoneId, timezone, shifts, seatingUnits, exception, startsAt } = input;

  if (exception?.kind === "closed") return null;

  const specDayOfWeek = DateTime.fromISO(date, { zone: timezone }).weekday % 7;
  const eligibleUnits = filterEligibleUnits(seatingUnits, partySize, zoneId);
  if (eligibleUnits.length === 0) return null;

  const reservations = normalizeReservations(input.activeReservations);
  const requestedStart = DateTime.fromISO(startsAt);

  for (const shift of shifts) {
    if (shift.dayOfWeek !== specDayOfWeek) continue;
    if (!shiftAppliesToZone(shift, zoneId)) continue;

    const effectiveShift = applyExceptionHours(shift, exception);
    const match = candidateStarts(effectiveShift, date, timezone).find(
      (c) => c.toMillis() === requestedStart.toMillis(),
    );
    if (!match) continue;
    if (!pacingAllows(effectiveShift, match, partySize, reservations)) continue;

    const endsAt = match.plus({ minutes: effectiveShift.turnDurationMin });
    return {
      serviceId: shift.serviceId,
      endsAt: endsAt.toUTC().toISO()!,
      eligibleUnits,
    };
  }

  return null;
}
