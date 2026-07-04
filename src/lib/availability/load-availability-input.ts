import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import { DateTime } from "luxon";
import type { db as dbClient } from "@/db/client";
import {
  mesa,
  reservation,
  reservationMesa,
  scheduleException,
  seatingUnit,
  seatingUnitMesa,
  shift,
} from "@/db/schema";
import type { ActiveReservationInput, ComputeAvailabilityInput, SeatingUnitInput } from "./types";

export type LoadAvailabilityInputParams = {
  restaurantId: string;
  timezone: string;
  date: string;
  partySize: number;
  zoneId?: string;
};

/** Junta desde Postgres todo lo que `computeAvailability` necesita para un slug+fecha dados. */
export async function loadAvailabilityInput(
  db: typeof dbClient,
  params: LoadAvailabilityInputParams,
): Promise<ComputeAvailabilityInput> {
  const { restaurantId, timezone, date, partySize, zoneId } = params;

  const dayStart = DateTime.fromISO(date, { zone: timezone }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });

  const [shiftRows, unitRows, unitMesaRows, exceptionRows, reservationRows] = await Promise.all([
    db.select().from(shift).where(eq(shift.restaurantId, restaurantId)),
    db
      .select()
      .from(seatingUnit)
      .where(and(eq(seatingUnit.restaurantId, restaurantId), eq(seatingUnit.active, true))),
    db
      .select({
        seatingUnitId: seatingUnitMesa.seatingUnitId,
        mesaId: seatingUnitMesa.mesaId,
        zoneId: mesa.zoneId,
      })
      .from(seatingUnitMesa)
      .innerJoin(mesa, eq(mesa.id, seatingUnitMesa.mesaId))
      .where(eq(mesa.restaurantId, restaurantId)),
    db
      .select()
      .from(scheduleException)
      .where(and(eq(scheduleException.restaurantId, restaurantId), eq(scheduleException.date, date))),
    db
      .select({
        reservationId: reservation.id,
        mesaId: reservationMesa.mesaId,
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        partySize: reservation.partySize,
      })
      .from(reservation)
      .innerJoin(reservationMesa, eq(reservationMesa.reservationId, reservation.id))
      .where(
        and(
          eq(reservation.restaurantId, restaurantId),
          notInArray(reservation.status, ["cancelled", "no_show"]),
          lt(reservation.startsAt, dayEnd.toJSDate()),
          gt(reservation.endsAt, dayStart.toJSDate()),
        ),
      ),
  ]);

  const mesaIdsByUnit = new Map<string, { zoneId: string; mesaIds: string[] }>();
  for (const row of unitMesaRows) {
    const existing = mesaIdsByUnit.get(row.seatingUnitId);
    if (existing) {
      existing.mesaIds.push(row.mesaId);
    } else {
      mesaIdsByUnit.set(row.seatingUnitId, { zoneId: row.zoneId, mesaIds: [row.mesaId] });
    }
  }

  const seatingUnits: SeatingUnitInput[] = unitRows.flatMap((u) => {
    const linked = mesaIdsByUnit.get(u.id);
    if (!linked || linked.mesaIds.length === 0) return [];
    return [
      {
        id: u.id,
        zoneId: linked.zoneId,
        minCapacity: u.minCapacity,
        maxCapacity: u.maxCapacity,
        mesaIds: linked.mesaIds,
      },
    ];
  });

  const reservationsById = new Map<string, ActiveReservationInput>();
  for (const row of reservationRows) {
    const existing = reservationsById.get(row.reservationId);
    if (existing) {
      existing.mesaIds.push(row.mesaId);
    } else {
      reservationsById.set(row.reservationId, {
        mesaIds: [row.mesaId],
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        partySize: row.partySize,
      });
    }
  }

  const exceptionRow = exceptionRows[0];

  return {
    date,
    partySize,
    zoneId,
    timezone,
    shifts: shiftRows,
    seatingUnits,
    activeReservations: Array.from(reservationsById.values()),
    exception: exceptionRow
      ? { kind: exceptionRow.kind, startTime: exceptionRow.startTime, endTime: exceptionRow.endTime }
      : null,
  };
}
