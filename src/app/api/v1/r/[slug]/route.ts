import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { service, zone } from "@/db/schema";
import { getRestaurantBySlug } from "@/db/restaurant";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [zones, services] = await Promise.all([
    db.select({ id: zone.id, name: zone.name }).from(zone).where(eq(zone.restaurantId, restaurant.id)).orderBy(asc(zone.position)),
    db
      .select({ id: service.id, name: service.name })
      .from(service)
      .where(eq(service.restaurantId, restaurant.id))
      .orderBy(asc(service.position)),
  ]);

  return NextResponse.json({
    slug: restaurant.slug,
    name: restaurant.name,
    timezone: restaurant.timezone,
    settings: restaurant.settings,
    zones,
    services,
  });
}
