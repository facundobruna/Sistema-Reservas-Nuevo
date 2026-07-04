import { DateTime } from "luxon";
import type {
  ActiveReservationInput,
  AvailabilitySlot,
  ComputeAvailabilityInput,
  SeatingUnitInput,
  ShiftInput,
} from "./types";

/** Construye el instante local (en `timezone`) de `date` a las `time` ("HH:MM" o "HH:MM:SS"). */
function localDateTime(date: string, time: string, timezone: string): DateTime {
  return DateTime.fromISO(`${date}T${time.slice(0, 5)}`, { zone: timezone });
}

function candidateStarts(
  shift: ShiftInput,
  date: string,
  timezone: string,
): DateTime[] {
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

function isUnitFree(
  unit: SeatingUnitInput,
  start: DateTime,
  end: DateTime,
  reservations: { mesaIds: string[]; startsAt: DateTime; endsAt: DateTime }[],
): boolean {
  return unit.mesaIds.every(
    (mesaId) =>
      !reservations.some((r) => r.mesaIds.includes(mesaId) && start < r.endsAt && r.startsAt < end),
  );
}

export function computeAvailability(input: ComputeAvailabilityInput): AvailabilitySlot[] {
  const { date, partySize, zoneId, timezone, shifts, seatingUnits, exception } = input;

  if (exception?.kind === "closed") return [];

  const specDayOfWeek = DateTime.fromISO(date, { zone: timezone }).weekday % 7;

  const eligibleUnits = seatingUnits
    .filter((u) => partySize >= u.minCapacity && partySize <= u.maxCapacity)
    .filter((u) => !zoneId || u.zoneId === zoneId)
    .sort((a, b) => a.maxCapacity - b.maxCapacity);

  if (eligibleUnits.length === 0) return [];

  const reservations = input.activeReservations.map((r: ActiveReservationInput) => ({
    mesaIds: r.mesaIds,
    partySize: r.partySize,
    startsAt: DateTime.fromISO(r.startsAt),
    endsAt: DateTime.fromISO(r.endsAt),
  }));

  const slots: AvailabilitySlot[] = [];

  for (const shift of shifts) {
    if (shift.dayOfWeek !== specDayOfWeek) continue;
    if (zoneId && shift.zoneId && shift.zoneId !== zoneId) continue;

    const effectiveShift =
      exception?.kind === "special_hours" && exception.startTime && exception.endTime
        ? { ...shift, startTime: exception.startTime, endTime: exception.endTime }
        : shift;

    for (const start of candidateStarts(effectiveShift, date, timezone)) {
      const end = start.plus({ minutes: effectiveShift.turnDurationMin });

      if (effectiveShift.pacingCap !== null) {
        const pacingWindowEnd = start.plus({ minutes: effectiveShift.slotIntervalMin });
        const covers = reservations
          .filter((r) => r.startsAt >= start && r.startsAt < pacingWindowEnd)
          .reduce((sum, r) => sum + r.partySize, 0);
        if (covers + partySize > effectiveShift.pacingCap) continue;
      }

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
