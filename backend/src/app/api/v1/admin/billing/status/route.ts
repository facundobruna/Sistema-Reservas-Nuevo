import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getSubscriptionByRestaurantId } from "@/db/subscription";
import { requireStaffSession } from "@/lib/auth/require-staff";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const subscription = await getSubscriptionByRestaurantId(db, auth.session.restaurantId);
  return NextResponse.json({ subscription });
}
