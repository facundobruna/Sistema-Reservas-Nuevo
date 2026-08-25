import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUser } from "@/db/schema";
import { getRestaurantBySlug } from "@/db/restaurant";
import { createStaffSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { staffLoginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = staffLoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { slug, email, password } = parsed.data;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const [staff] = await db
    .select()
    .from(staffUser)
    .where(and(eq(staffUser.restaurantId, restaurant.id), eq(staffUser.email, email)))
    .limit(1);

  if (!staff || !staff.passwordHash || !verifyPassword(password, staff.passwordHash)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createStaffSession({
    staffId: staff.id,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    role: staff.role,
    email: staff.email,
  });

  return NextResponse.json({ ok: true, role: staff.role, restaurantSlug: restaurant.slug });
}
