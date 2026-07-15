import { and, asc, eq, gt, lt, notInArray } from "drizzle-orm";
import { DateTime } from "luxon";
import type { db as dbClient } from "./client";
import { customer, reservation } from "./schema";

const DAYS_BACK = 3;
const DAYS_AHEAD = 60;

export type CalendarFeedReservation = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  partySize: number;
  customerName: string | null;
  customerPhone: string;
};

/** Reservas activas de un restaurante en una ventana rolling (pasado reciente + futuro
 *  cercano) para el feed iCal — no hace falta el historial completo para un calendario vivo. */
export async function getCalendarFeed(db: typeof dbClient, restaurantId: string): Promise<CalendarFeedReservation[]> {
  const now = DateTime.now();
  const from = now.minus({ days: DAYS_BACK }).toJSDate();
  const to = now.plus({ days: DAYS_AHEAD }).toJSDate();

  return db
    .select({
      id: reservation.id,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      partySize: reservation.partySize,
      customerName: customer.name,
      customerPhone: customer.phone,
    })
    .from(reservation)
    .innerJoin(customer, eq(customer.id, reservation.customerId))
    .where(
      and(
        eq(reservation.restaurantId, restaurantId),
        notInArray(reservation.status, ["cancelled", "no_show"]),
        gt(reservation.startsAt, from),
        lt(reservation.startsAt, to),
      ),
    )
    .orderBy(asc(reservation.startsAt));
}
