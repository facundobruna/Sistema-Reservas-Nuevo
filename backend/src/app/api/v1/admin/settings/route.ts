import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant, staffUser } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { createCalendarToken } from "@/lib/reservation/calendar-token";
import { settingsUpdateSchema } from "@/lib/validation/admin";

export async function GET(request: Request) {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const [row] = await db.select().from(restaurant).where(eq(restaurant.id, auth.session.restaurantId)).limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [owner] = await db
    .select({ email: staffUser.email })
    .from(staffUser)
    .where(and(eq(staffUser.restaurantId, auth.session.restaurantId), eq(staffUser.role, "owner")))
    .limit(1);

  const settings = row.settings as { calendarTokenVersion?: number };
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const token = createCalendarToken(row.id, settings.calendarTokenVersion ?? 0);
  const calendarUrl = `${appUrl}/api/v1/r/${row.slug}/calendar.ics?token=${token}`;

  return NextResponse.json({ restaurant: row, ownerEmail: owner?.email ?? null, calendarUrl });
}

export async function PATCH(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const parsed = settingsUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [current] = await db
    .select({ settings: restaurant.settings })
    .from(restaurant)
    .where(eq(restaurant.id, auth.session.restaurantId))
    .limit(1);
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { settings, ...rest } = parsed.data;
  const mergedSettings = settings
    ? { ...(current.settings as Record<string, unknown>), ...settings }
    : undefined;

  const [updated] = await db
    .update(restaurant)
    .set({
      ...rest,
      ...(mergedSettings ? { settings: mergedSettings } : {}),
      updatedAt: new Date(),
    })
    .where(eq(restaurant.id, auth.session.restaurantId))
    .returning();

  return NextResponse.json({ restaurant: updated });
}
