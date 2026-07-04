import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { reservation, restaurant } from "@/db/schema";
import { getDinerSession } from "@/lib/auth/diner-session";

export async function GET() {
  const session = await getDinerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: reservation.id,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      partySize: reservation.partySize,
      status: reservation.status,
      specialRequests: reservation.specialRequests,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
    })
    .from(reservation)
    .innerJoin(restaurant, eq(restaurant.id, reservation.restaurantId))
    .where(eq(reservation.customerId, session.customerId))
    .orderBy(desc(reservation.startsAt));

  return NextResponse.json({ reservations: rows });
}
