import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { findOrCreateCustomer } from "@/db/customer";
import { joinWaitlist } from "@/db/waitlist";
import { waitlistJoinSchema } from "@/lib/validation/booking";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = waitlistJoinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, partySize, customer } = parsed.data;

  const customerRecord = await findOrCreateCustomer(db, restaurant.id, customer);

  const entry = await joinWaitlist(db, {
    restaurantId: restaurant.id,
    customerId: customerRecord.id,
    date,
    partySize,
  });

  return NextResponse.json({ waitlistEntry: entry }, { status: 201 });
}
