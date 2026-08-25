import { and, eq, lt, sql } from "drizzle-orm";
import type { db as dbClient } from "./client";
import {
  customerRestaurant,
  mesa,
  notification,
  reservation,
  reservationMesa,
  restaurant,
  seatingUnit,
  seatingUnitMesa,
} from "./schema";
import { canTransition, type ReservationStatus } from "@/lib/reservation/status-machine";

export type UpdateStatusResult =
  | { ok: true; reservation: typeof reservation.$inferSelect }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "invalid_transition"; from: ReservationStatus };

/**
 * Único punto de cambio de estado de una reserva. Valida la transición contra
 * la máquina de estados, libera la mesa (borra reservation_mesa) al cancelar
 * o marcar no_show, y actualiza los contadores de customer_restaurant.
 */
export async function updateReservationStatus(
  db: typeof dbClient,
  restaurantId: string,
  reservationId: string,
  newStatus: ReservationStatus,
): Promise<UpdateStatusResult> {
  return db.transaction(async (trx) => {
    const [current] = await trx
      .select()
      .from(reservation)
      .where(and(eq(reservation.id, reservationId), eq(reservation.restaurantId, restaurantId)))
      .limit(1);
    if (!current) return { ok: false, error: "not_found" };
    if (!canTransition(current.status, newStatus)) {
      return { ok: false, error: "invalid_transition", from: current.status };
    }

    if (newStatus === "cancelled" || newStatus === "no_show") {
      await trx.delete(reservationMesa).where(eq(reservationMesa.reservationId, reservationId));
      // No mandar confirmación/recordatorio de una reserva que ya no va a pasar.
      await trx
        .delete(notification)
        .where(and(eq(notification.reservationId, reservationId), eq(notification.status, "scheduled")));
    }

    const [updated] = await trx
      .update(reservation)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(reservation.id, reservationId))
      .returning();

    if (newStatus === "no_show") {
      await trx
        .update(customerRestaurant)
        .set({ noShowCount: sql`${customerRestaurant.noShowCount} + 1` })
        .where(and(eq(customerRestaurant.restaurantId, restaurantId), eq(customerRestaurant.customerId, updated.customerId)));
    }
    if (newStatus === "completed") {
      await trx
        .update(customerRestaurant)
        .set({ visitCount: sql`${customerRestaurant.visitCount} + 1` })
        .where(and(eq(customerRestaurant.restaurantId, restaurantId), eq(customerRestaurant.customerId, updated.customerId)));
    }

    return { ok: true, reservation: updated };
  });
}

/** Cancela una reserva (usado por el flujo público del comensal, ya autorizado por sesión). */
export async function cancelReservation(db: typeof dbClient, restaurantId: string, reservationId: string) {
  const result = await updateReservationStatus(db, restaurantId, reservationId, "cancelled");
  return result.ok ? result.reservation : null;
}

export async function getReservationById(db: typeof dbClient, restaurantId: string, reservationId: string) {
  const [row] = await db
    .select()
    .from(reservation)
    .where(and(eq(reservation.id, reservationId), eq(reservation.restaurantId, restaurantId)))
    .limit(1);
  return row ?? null;
}

/** El comensal reafirmó que viene (click en el link del recordatorio) — señal para el staff, no cambia el status. */
export async function markConfirmedByDiner(db: typeof dbClient, reservationId: string) {
  const [updated] = await db
    .update(reservation)
    .set({ confirmedByDinerAt: new Date() })
    .where(eq(reservation.id, reservationId))
    .returning();
  return updated ?? null;
}

export type OverdueReservationCandidate = {
  id: string;
  restaurantId: string;
  startsAt: Date;
  restaurantSettings: unknown;
};

/** Reservas 'confirmed' cuyo horario ya pasó — candidatas a no-show automático (el worker filtra por el margen configurado). */
export async function findOverdueConfirmedReservations(
  db: typeof dbClient,
  now: Date,
): Promise<OverdueReservationCandidate[]> {
  return db
    .select({
      id: reservation.id,
      restaurantId: reservation.restaurantId,
      startsAt: reservation.startsAt,
      restaurantSettings: restaurant.settings,
    })
    .from(reservation)
    .innerJoin(restaurant, eq(restaurant.id, reservation.restaurantId))
    .where(and(eq(reservation.status, "confirmed"), lt(reservation.startsAt, now)));
}

export type ReassignResult =
  | { ok: true; reservation: typeof reservation.$inferSelect }
  | { ok: false; error: "not_found" | "invalid_unit" | "conflict" };

/**
 * Cambia la seating_unit de una reserva existente (mismo horario). Igual que
 * bookReservation: se intenta el insert en reservation_mesa y se deja que el
 * EXCLUDE de Postgres decida si hay conflicto real, en vez de re-chequear a mano.
 */
export async function reassignReservationUnit(
  db: typeof dbClient,
  restaurantId: string,
  reservationId: string,
  newSeatingUnitId: string,
): Promise<ReassignResult> {
  return db.transaction(async (trx) => {
    const [current] = await trx
      .select()
      .from(reservation)
      .where(and(eq(reservation.id, reservationId), eq(reservation.restaurantId, restaurantId)))
      .limit(1);
    if (!current) return { ok: false, error: "not_found" };

    const unitMesas = await trx
      .select({ mesaId: seatingUnitMesa.mesaId, zoneId: mesa.zoneId })
      .from(seatingUnitMesa)
      .innerJoin(mesa, eq(mesa.id, seatingUnitMesa.mesaId))
      .innerJoin(seatingUnit, eq(seatingUnit.id, seatingUnitMesa.seatingUnitId))
      .where(and(eq(seatingUnitMesa.seatingUnitId, newSeatingUnitId), eq(seatingUnit.restaurantId, restaurantId)));
    if (unitMesas.length === 0) return { ok: false, error: "invalid_unit" };

    await trx.delete(reservationMesa).where(eq(reservationMesa.reservationId, reservationId));

    try {
      await trx.insert(reservationMesa).values(
        unitMesas.map((m) => ({
          reservationId,
          mesaId: m.mesaId,
          periodo: sql`tstzrange(${current.startsAt}::timestamptz, ${current.endsAt}::timestamptz, '[)')`,
        })),
      );
    } catch (err) {
      const code = (err as { cause?: { code?: string }; code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
      if (code === "23P01") return { ok: false, error: "conflict" };
      throw err;
    }

    const [updated] = await trx
      .update(reservation)
      .set({ seatingUnitId: newSeatingUnitId, zoneId: unitMesas[0].zoneId, updatedAt: new Date() })
      .where(eq(reservation.id, reservationId))
      .returning();

    return { ok: true, reservation: updated };
  });
}
