import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { settingsUpdateSchema } from "@/lib/validation/admin";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const [row] = await db.select().from(restaurant).where(eq(restaurant.id, auth.session.restaurantId)).limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ restaurant: row });
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
