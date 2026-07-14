import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant, subscription } from "@/db/schema";
import { requireSuperadminSession } from "@/lib/auth/require-superadmin";

export async function GET() {
  const auth = await requireSuperadminSession();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select({
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      createdAt: restaurant.createdAt,
      suspendedAt: restaurant.suspendedAt,
      subscriptionStatus: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
    })
    .from(restaurant)
    .leftJoin(subscription, eq(subscription.restaurantId, restaurant.id))
    .orderBy(desc(restaurant.createdAt));

  return NextResponse.json({ tenants: rows });
}
