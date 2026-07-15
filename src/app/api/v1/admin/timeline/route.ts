import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant } from "@/db/schema";
import { getTimeline } from "@/db/timeline";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { timelineQuerySchema } from "@/lib/validation/admin";

export async function GET(request: Request) {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const parsed = timelineQuerySchema.safeParse({ date: url.searchParams.get("date") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [restaurantRow] = await db
    .select({ timezone: restaurant.timezone })
    .from(restaurant)
    .where(eq(restaurant.id, auth.session.restaurantId))
    .limit(1);
  if (!restaurantRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await getTimeline(db, auth.session.restaurantId, restaurantRow.timezone, parsed.data.date);
  return NextResponse.json(result);
}
