import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import { restaurant, service, zone } from "./schema";

export async function getRestaurantBySlug(slug: string) {
  const [row] = await db.select().from(restaurant).where(eq(restaurant.slug, slug)).limit(1);
  return row ?? null;
}

/** Info pública para el flujo de reserva: usada tanto por GET /api/v1/r/{slug} como por la página del wizard. */
export async function getPublicRestaurantInfo(slug: string) {
  const restaurantRow = await getRestaurantBySlug(slug);
  if (!restaurantRow) return null;

  const [zones, services] = await Promise.all([
    db
      .select({ id: zone.id, name: zone.name })
      .from(zone)
      .where(eq(zone.restaurantId, restaurantRow.id))
      .orderBy(asc(zone.position)),
    db
      .select({ id: service.id, name: service.name })
      .from(service)
      .where(eq(service.restaurantId, restaurantRow.id))
      .orderBy(asc(service.position)),
  ]);

  return { restaurant: restaurantRow, zones, services };
}
