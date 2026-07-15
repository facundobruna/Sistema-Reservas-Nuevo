import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { createCalendarToken } from "@/lib/reservation/calendar-token";

/** Invalida el link de calendario anterior subiendo su versión — no rota el secreto HMAC entero. */
export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const [current] = await db
    .select({ settings: restaurant.settings })
    .from(restaurant)
    .where(eq(restaurant.id, auth.session.restaurantId))
    .limit(1);
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const settings = current.settings as { calendarTokenVersion?: number };
  const nextVersion = (settings.calendarTokenVersion ?? 0) + 1;

  await db
    .update(restaurant)
    .set({ settings: { ...settings, calendarTokenVersion: nextVersion }, updatedAt: new Date() })
    .where(eq(restaurant.id, auth.session.restaurantId));

  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const token = createCalendarToken(auth.session.restaurantId, nextVersion);
  const calendarUrl = `${appUrl}/api/v1/r/${auth.session.restaurantSlug}/calendar.ics?token=${token}`;

  return NextResponse.json({ calendarUrl });
}
