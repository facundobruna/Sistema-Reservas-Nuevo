import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant } from "@/db/schema";
import { createRestaurantOnboarding } from "@/db/onboarding";
import { createStaffSession } from "@/lib/auth/session";
import { onboardingSchema } from "@/lib/validation/onboarding";

export async function POST(request: Request) {
  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: restaurant.id })
    .from(restaurant)
    .where(eq(restaurant.slug, parsed.data.slug))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  let created: Awaited<ReturnType<typeof createRestaurantOnboarding>>;
  try {
    created = await createRestaurantOnboarding(db, parsed.data);
  } catch (err) {
    // Carrera entre el chequeo de arriba y el insert: el unique constraint de slug es el árbitro final.
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    throw err;
  }

  await createStaffSession({
    staffId: created.owner.id,
    restaurantId: created.restaurant.id,
    restaurantSlug: created.restaurant.slug,
    role: created.owner.role,
    email: created.owner.email,
  });

  return NextResponse.json({ ok: true, slug: created.restaurant.slug }, { status: 201 });
}
