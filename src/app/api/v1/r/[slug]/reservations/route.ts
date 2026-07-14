import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { findOrCreateCustomer } from "@/db/customer";
import { scheduleReservationNotifications } from "@/db/notification";
import { markWaitlistBooked } from "@/db/waitlist";
import { createDinerSession } from "@/lib/auth/diner-session";
import { isWithinBookingWindow } from "@/lib/availability";
import { bookReservation } from "@/lib/reservation/book-reservation";
import { createReservationSchema } from "@/lib/validation/booking";

type Params = { params: Promise<{ slug: string }> };

type RestaurantSettings = {
  reminderHoursBefore?: number;
  minAdvanceMinutes?: number;
  maxAdvanceDays?: number | null;
  maxOnlinePartySize?: number | null;
  largeGroupPhone?: string;
};

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = createReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { startsAt, partySize, zoneId, specialRequests, customer } = parsed.data;
  const settings = restaurant.settings as RestaurantSettings;

  // Topes exclusivos del autoservicio online — un walk-in o una reserva telefónica
  // que carga el staff a mano no pasan por ninguno de los dos.
  if (settings.maxOnlinePartySize != null && partySize > settings.maxOnlinePartySize) {
    return NextResponse.json({ error: "party_too_large" }, { status: 422 });
  }
  if (
    !isWithinBookingWindow(startsAt, new Date(), {
      minAdvanceMinutes: settings.minAdvanceMinutes,
      maxAdvanceDays: settings.maxAdvanceDays,
    })
  ) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  const customerRecord = await findOrCreateCustomer(db, restaurant.id, customer);

  const result = await bookReservation(db, {
    restaurantId: restaurant.id,
    timezone: restaurant.timezone,
    customerId: customerRecord.id,
    partySize,
    zoneId,
    startsAt,
    specialRequests,
    source: "web",
  });

  if (!result.ok) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  await scheduleReservationNotifications(db, {
    reservationId: result.reservation.id,
    startsAt: result.reservation.startsAt.toISOString(),
    reminderHoursBefore: settings.reminderHoursBefore ?? 3,
  });

  // Si estaba anotado en lista de espera para este día, ya consiguió mesa por su cuenta.
  await markWaitlistBooked(db, {
    restaurantId: restaurant.id,
    customerId: customerRecord.id,
    date: DateTime.fromJSDate(result.reservation.startsAt).setZone(restaurant.timezone).toISODate()!,
  });

  await createDinerSession(customerRecord.id);

  return NextResponse.json({ reservation: result.reservation }, { status: 201 });
}
