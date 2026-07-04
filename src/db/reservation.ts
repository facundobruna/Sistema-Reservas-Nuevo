import { and, eq } from "drizzle-orm";
import type { db as dbClient } from "./client";
import { reservation, reservationMesa } from "./schema";

/** Cancela una reserva y libera el inventario (borra sus filas de reservation_mesa). */
export async function cancelReservation(db: typeof dbClient, reservationId: string) {
  return db.transaction(async (trx) => {
    await trx.delete(reservationMesa).where(eq(reservationMesa.reservationId, reservationId));

    const [updated] = await trx
      .update(reservation)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(reservation.id, reservationId)))
      .returning();

    return updated ?? null;
  });
}
