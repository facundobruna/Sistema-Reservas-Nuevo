import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { reservation, type restaurant as restaurantTable } from "@/db/schema";
import { getRestaurantBySlug } from "@/db/restaurant";
import { cancelReservation } from "@/db/reservation";
import { scheduleReservationNotifications } from "@/db/notification";
import { markWaitlistBooked } from "@/db/waitlist";
import { getDinerSession } from "@/lib/auth/diner-session";
import { bookReservation } from "@/lib/reservation/book-reservation";
import { updateReservationSchema } from "@/lib/validation/booking";

type Params = { params: Promise<{ slug: string; id: string }> };
type Restaurant = typeof restaurantTable.$inferSelect;

async function loadOwnedReservation(slug: string, id: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) } as const;

  const session = await getDinerSession();
  if (!session) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;

  const [row] = await db
    .select()
    .from(reservation)
    .where(and(eq(reservation.id, id), eq(reservation.restaurantId, restaurant.id)))
    .limit(1);

  if (!row) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) } as const;
  if (row.customerId !== session.customerId) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) } as const;
  }

  return { reservation: row, restaurant } as const;
}

export async function GET(_request: Request, { params }: Params) {
  const { slug, id } = await params;
  const result = await loadOwnedReservation(slug, id);
  if ("error" in result) return result.error;
  return NextResponse.json({ reservation: result.reservation });
}

/**
 * Modificar horario y/o cantidad de comensales: se intenta reservar el nuevo
 * horario primero (revalidando disponibilidad de verdad vía bookReservation)
 * y solo si sale bien se cancela la reserva vieja — así nunca se pierde una
 * reserva confirmada por una modificación que termina fallando.
 */
async function modifyReservation(
  restaurant: Restaurant,
  current: typeof reservation.$inferSelect,
  changes: { startsAt?: string; partySize?: number },
) {
  const newStartsAt = changes.startsAt ?? current.startsAt.toISOString();
  const newPartySize = changes.partySize ?? current.partySize;

  const result = await bookReservation(db, {
    restaurantId: restaurant.id,
    timezone: restaurant.timezone,
    customerId: current.customerId,
    partySize: newPartySize,
    zoneId: current.zoneId ?? undefined,
    startsAt: newStartsAt,
    specialRequests: current.specialRequests ?? undefined,
    source: current.source,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  await cancelReservation(db, restaurant.id, current.id);

  const settings = restaurant.settings as { reminderHoursBefore?: number };
  await scheduleReservationNotifications(db, {
    reservationId: result.reservation.id,
    startsAt: result.reservation.startsAt.toISOString(),
    reminderHoursBefore: settings.reminderHoursBefore ?? 3,
  });
  await markWaitlistBooked(db, {
    restaurantId: restaurant.id,
    customerId: current.customerId,
    date: DateTime.fromJSDate(result.reservation.startsAt).setZone(restaurant.timezone).toISODate()!,
  });

  return NextResponse.json({ reservation: result.reservation });
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug, id } = await params;
  const result = await loadOwnedReservation(slug, id);
  if ("error" in result) return result.error;

  const parsed = updateReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status === "cancelled") {
    const cancelled = await cancelReservation(db, result.reservation.restaurantId, id);
    return NextResponse.json({ reservation: cancelled });
  }

  if (parsed.data.startsAt !== undefined || parsed.data.partySize !== undefined) {
    if (result.reservation.status !== "confirmed" && result.reservation.status !== "pending") {
      return NextResponse.json({ error: "not_modifiable" }, { status: 422 });
    }
    return modifyReservation(result.restaurant, result.reservation, {
      startsAt: parsed.data.startsAt,
      partySize: parsed.data.partySize,
    });
  }

  const [updated] = await db
    .update(reservation)
    .set({ specialRequests: parsed.data.specialRequests, updatedAt: new Date() })
    .where(eq(reservation.id, id))
    .returning();

  return NextResponse.json({ reservation: updated });
}
