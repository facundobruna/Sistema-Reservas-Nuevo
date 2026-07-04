import { eq } from "drizzle-orm";
import { db } from "./client";
import { restaurant } from "./schema";

export async function getRestaurantBySlug(slug: string) {
  const [row] = await db.select().from(restaurant).where(eq(restaurant.slug, slug)).limit(1);
  return row ?? null;
}
