import { DateTime } from "luxon";
import { sql } from "drizzle-orm";
import type { db as dbClient } from "@/db/client";
import { reservation, reservationMesa } from "@/db/schema";
import { isPast, loadAvailabilityInput, resolveSlot } from "@/lib/availability";

const EXCLUSION_VIOLATION = "23P01";
const DEADLOCK_DETECTED = "40P01";
const MAX_DEADLOCK_RETRIES = 3;

export type BookReservationParams = {
  restaurantId: string;
  timezone: string;
  customerId: string;
  partySize: number;
  zoneId?: string;
  /** ISO instant (UTC) — debe ser exactamente uno de los slots que devolvió /availability. */
  startsAt: string;
  specialRequests?: string;
  source: "web" | "whatsapp" | "manual";
};

export type BookReservationResult =
  | { ok: true; reservation: typeof reservation.$inferSelect }
  | { ok: false; error: "sin_disponibilidad" };

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const candidate = err as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return pgErrorCode(candidate.cause);
}

type UnitAttemptOutcome =
  | { outcome: "won"; reservation: typeof reservation.$inferSelect }
  | { outcome: "taken" };

/**
 * Intenta reservar UNA unidad candidata. Bajo concurrencia real, dos
 * transacciones que compiten por el mismo `mesa_id` pueden resolverse de dos
 * formas distintas del lado de Postgres: una viola limpio el EXCLUDE
 * (`23P01`, la unidad está tomada de verdad) o el detector de deadlocks aborta
 * una de las dos (`40P01`, no dice nada sobre disponibilidad — hay que
 * reintentar la misma unidad).
 */
async function attemptUnit(
  db: typeof dbClient,
  unit: { id: string; zoneId: string; mesaIds: string[] },
  params: BookReservationParams,
  resolved: { serviceId: string },
  startsAtDate: Date,
  endsAtDate: Date,
): Promise<UnitAttemptOutcome> {
  for (let attempt = 0; attempt <= MAX_DEADLOCK_RETRIES; attempt++) {
    try {
      const created = await db.transaction(async (trx) => {
        const [newReservation] = await trx
          .insert(reservation)
          .values({
            restaurantId: params.restaurantId,
            customerId: params.customerId,
            serviceId: resolved.serviceId,
            seatingUnitId: unit.id,
            zoneId: unit.zoneId,
            startsAt: startsAtDate,
            endsAt: endsAtDate,
            partySize: params.partySize,
            status: "confirmed",
            specialRequests: params.specialRequests,
            source: params.source,
          })
          .returning();

        await trx.insert(reservationMesa).values(
          unit.mesaIds.map((mesaId) => ({
            reservationId: newReservation.id,
            mesaId,
            periodo: sql`tstzrange(${startsAtDate}::timestamptz, ${endsAtDate}::timestamptz, '[)')`,
          })),
        );

        return newReservation;
      });

      return { outcome: "won", reservation: created };
    } catch (err) {
      const code = pgErrorCode(err);
      if (code === EXCLUSION_VIOLATION) return { outcome: "taken" };
      if (code === DEADLOCK_DETECTED && attempt < MAX_DEADLOCK_RETRIES) continue;
      throw err;
    }
  }
  // Se agotaron los reintentos de deadlock sin resolución clara: tratamos la
  // unidad como no disponible en este intento en vez de reventar el pedido.
  return { outcome: "taken" };
}

/**
 * Único punto de escritura de reservas. Revalida disponibilidad server-side
 * (nunca confía en lo que mandó el cliente más allá del horario elegido) y
 * prueba las unidades candidatas en orden best-fit, una transacción por
 * intento. El constraint `sin_solape` de Postgres es el árbitro final bajo
 * concurrencia.
 */
export async function bookReservation(
  db: typeof dbClient,
  params: BookReservationParams,
): Promise<BookReservationResult> {
  const date = DateTime.fromISO(params.startsAt, { zone: params.timezone }).toISODate();
  if (!date) return { ok: false, error: "sin_disponibilidad" };

  // No se puede reservar un horario que ya pasó (relevante sobre todo al pedir para "hoy").
  if (isPast(params.startsAt)) return { ok: false, error: "sin_disponibilidad" };

  const availabilityInput = await loadAvailabilityInput(db, {
    restaurantId: params.restaurantId,
    timezone: params.timezone,
    date,
    partySize: params.partySize,
    zoneId: params.zoneId,
  });

  const resolved = resolveSlot({ ...availabilityInput, startsAt: params.startsAt });
  if (!resolved) return { ok: false, error: "sin_disponibilidad" };

  const startsAtDate = new Date(params.startsAt);
  const endsAtDate = new Date(resolved.endsAt);

  for (const unit of resolved.eligibleUnits) {
    const result = await attemptUnit(db, unit, params, resolved, startsAtDate, endsAtDate);
    if (result.outcome === "won") return { ok: true, reservation: result.reservation };
  }

  return { ok: false, error: "sin_disponibilidad" };
}
