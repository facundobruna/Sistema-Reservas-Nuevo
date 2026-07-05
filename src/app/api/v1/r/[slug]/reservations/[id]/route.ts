import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { reservation } from "@/db/schema";
import { getRestaurantBySlug } from "@/db/restaurant";
import { cancelReservation } from "@/db/reservation";
import { getDinerSession } from "@/lib/auth/diner-session";
import { updateReservationSchema } from "@/lib/validation/booking";

type Params = { params: Promise<{ slug: string; id: string }> };

async function loadOwnedReservation(slug: string, id: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) } as const;

  const session = await getDinerSession();
  if (!session) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;

  const [row] = await db
    .select()
    .from(reservation)
    .where(and(eq(reservation.id, id), eq(reservation.restaurantId, restaurant.id)))
    .limit(1);

  if (!row) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) } as const;
  if (row.customerId !== session.customerId) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) } as const;
  }

  return { reservation: row } as const;
}

export async function GET(_request: Request, { params }: Params) {
  const { slug, id } = await params;
  const result = await loadOwnedReservation(slug, id);
  if ("error" in result) return result.error;
  return NextResponse.json({ reservation: result.reservation });
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug, id } = await params;
  const result = await loadOwnedReservation(slug, id);
  if ("error" in result) return result.error;

  const parsed = updateReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status === "cancelled") {
    const cancelled = await cancelReservation(db, result.reservation.restaurantId, id);
    return NextResponse.json({ reservation: cancelled });
  }

  const [updated] = await db
    .update(reservation)
    .set({ specialRequests: parsed.data.specialRequests, updatedAt: new Date() })
    .where(eq(reservation.id, id))
    .returning();

  return NextResponse.json({ reservation: updated });
}
