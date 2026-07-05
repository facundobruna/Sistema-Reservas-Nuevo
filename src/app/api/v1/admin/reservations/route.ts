import { and, asc, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { customer, reservation, restaurant } from "@/db/schema";
import { findOrCreateCustomer } from "@/db/customer";
import { scheduleReservationNotifications } from "@/db/notification";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { bookReservation } from "@/lib/reservation/book-reservation";
import { reservationCreateSchema, reservationListQuerySchema } from "@/lib/validation/admin";

export async function GET(request: Request) {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const parsed = reservationListQuerySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [restaurantRow] = await db
    .select({ timezone: restaurant.timezone })
    .from(restaurant)
    .where(eq(restaurant.id, auth.session.restaurantId))
    .limit(1);

  const conditions = [eq(reservation.restaurantId, auth.session.restaurantId)];
  if (parsed.data.status) conditions.push(eq(reservation.status, parsed.data.status));
  if (parsed.data.zoneId) conditions.push(eq(reservation.zoneId, parsed.data.zoneId));

  const rows = await db
    .select({
      id: reservation.id,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      partySize: reservation.partySize,
      status: reservation.status,
      specialRequests: reservation.specialRequests,
      source: reservation.source,
      zoneId: reservation.zoneId,
      seatingUnitId: reservation.seatingUnitId,
      customerId: reservation.customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
    })
    .from(reservation)
    .innerJoin(customer, eq(customer.id, reservation.customerId))
    .where(and(...conditions))
    .orderBy(asc(reservation.startsAt));

  // starts_at es timestamptz; el filtro por día se hace en el timezone del
  // restaurante (no en UTC), para que la agenda de "hoy" coincida con lo que
  // el staff entiende como "hoy" localmente.
  const filtered = parsed.data.date
    ? rows.filter(
        (r) => DateTime.fromJSDate(r.startsAt).setZone(restaurantRow.timezone).toISODate() === parsed.data.date,
      )
    : rows;

  return NextResponse.json({ reservations: filtered });
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager", "host"]);
  if ("error" in auth) return auth.error;

  const parsed = reservationCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { startsAt, partySize, zoneId, specialRequests, seated, customer: customerInput } = parsed.data;

  const [restaurantRow] = await db
    .select()
    .from(restaurant)
    .where(eq(restaurant.id, auth.session.restaurantId))
    .limit(1);
  if (!restaurantRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const customerRecord = await findOrCreateCustomer(db, auth.session.restaurantId, customerInput);

  const result = await bookReservation(db, {
    restaurantId: auth.session.restaurantId,
    timezone: restaurantRow.timezone,
    customerId: customerRecord.id,
    partySize,
    zoneId,
    startsAt,
    specialRequests,
    source: "manual",
    initialStatus: seated ? "seated" : "confirmed",
  });

  if (!result.ok) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  // Un walk-in que ya está sentado no necesita confirmación ni recordatorio;
  // una reserva manual para más tarde sí, igual que si la hiciera el comensal.
  if (!seated) {
    const settings = restaurantRow.settings as { reminderHoursBefore?: number };
    await scheduleReservationNotifications(db, {
      reservationId: result.reservation.id,
      startsAt: result.reservation.startsAt.toISOString(),
      reminderHoursBefore: settings.reminderHoursBefore ?? 3,
    });
  }

  return NextResponse.json({ reservation: result.reservation }, { status: 201 });
}
