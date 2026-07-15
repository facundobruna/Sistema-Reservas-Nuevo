import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import { DateTime } from "luxon";
import type { db as dbClient } from "./client";
import { customer, mesaBlock, reservation, reservationMesa, type reservationStatusEnum } from "./schema";

type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];

export type TimelineOccupied = {
  mesaId: string;
  reservationId: string;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  partySize: number;
  customerName: string | null;
};

export type TimelineBlock = { id: string; mesaId: string; note: string | null };

/** Todo lo que necesita la grilla mesa × hora para una fecha: ocupación real (a nivel mesa,
 *  ya resuelta desde reservation_mesa, así que un combo cubre cada una de sus mesas por
 *  separado) + bloqueos manuales de ese día. */
export async function getTimeline(
  db: typeof dbClient,
  restaurantId: string,
  timezone: string,
  date: string,
): Promise<{ occupied: TimelineOccupied[]; blocks: TimelineBlock[] }> {
  const dayStart = DateTime.fromISO(date, { zone: timezone }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });

  const [occupiedRows, blockRows] = await Promise.all([
    db
      .select({
        mesaId: reservationMesa.mesaId,
        reservationId: reservation.id,
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        status: reservation.status,
        partySize: reservation.partySize,
        customerName: customer.name,
      })
      .from(reservationMesa)
      .innerJoin(reservation, eq(reservation.id, reservationMesa.reservationId))
      .innerJoin(customer, eq(customer.id, reservation.customerId))
      .where(
        and(
          eq(reservation.restaurantId, restaurantId),
          notInArray(reservation.status, ["cancelled", "no_show"]),
          lt(reservation.startsAt, dayEnd.toJSDate()),
          gt(reservation.endsAt, dayStart.toJSDate()),
        ),
      ),
    db
      .select({ id: mesaBlock.id, mesaId: mesaBlock.mesaId, note: mesaBlock.note })
      .from(mesaBlock)
      .where(and(eq(mesaBlock.restaurantId, restaurantId), eq(mesaBlock.date, date))),
  ]);

  return {
    occupied: occupiedRows.map((r) => ({ ...r, startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString() })),
    blocks: blockRows,
  };
}
