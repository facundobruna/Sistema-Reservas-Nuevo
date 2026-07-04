import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { computeAvailability, loadAvailabilityInput } from "@/lib/availability";
import { availabilityQuerySchema } from "@/lib/validation/booking";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    date: url.searchParams.get("date"),
    partySize: url.searchParams.get("partySize"),
    zoneId: url.searchParams.get("zoneId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = await loadAvailabilityInput(db, {
    restaurantId: restaurant.id,
    timezone: restaurant.timezone,
    date: parsed.data.date,
    partySize: parsed.data.partySize,
    zoneId: parsed.data.zoneId,
  });

  const slots = computeAvailability(input);
  return NextResponse.json({ slots });
}
