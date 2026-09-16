import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant } from "@/db/schema";
import { getSubscriptionByRestaurantId } from "@/db/subscription";
import { requireSuperadminSession } from "@/lib/auth/require-superadmin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSuperadminSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [restaurantRow] = await db.select().from(restaurant).where(eq(restaurant.id, id)).limit(1);
  if (!restaurantRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const subscription = await getSubscriptionByRestaurantId(db, id);

  return NextResponse.json({ restaurant: restaurantRow, subscription });
}
