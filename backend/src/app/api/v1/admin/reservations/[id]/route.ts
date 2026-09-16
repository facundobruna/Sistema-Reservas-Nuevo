import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { customer, reservation } from "@/db/schema";
import { reassignReservationUnit, updateReservationStatus } from "@/db/reservation";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { reservationUpdateSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const [row] = await db
    .select({
      id: reservation.id,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      partySize: reservation.partySize,
      status: reservation.status,
      specialRequests: reservation.specialRequests,
      source: reservation.source,
      zoneId: reservation.zoneId,
      seatingUnitId: reservation.seatingUnitId,
      customerId: reservation.customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
    })
    .from(reservation)
    .innerJoin(customer, eq(customer.id, reservation.customerId))
    .where(and(eq(reservation.id, id), eq(reservation.restaurantId, auth.session.restaurantId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ reservation: row });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager", "host"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = reservationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { status, seatingUnitId, specialRequests } = parsed.data;

  if (status) {
    const result = await updateReservationStatus(db, auth.session.restaurantId, id, status);
    if (!result.ok) {
      if (result.error === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ error: "invalid_transition", from: result.from }, { status: 422 });
    }
    return NextResponse.json({ reservation: result.reservation });
  }

  if (seatingUnitId) {
    const result = await reassignReservationUnit(db, auth.session.restaurantId, id, seatingUnitId);
    if (!result.ok) {
      const statusCode = result.error === "not_found" ? 404 : result.error === "invalid_unit" ? 400 : 409;
      return NextResponse.json({ error: result.error }, { status: statusCode });
    }
    return NextResponse.json({ reservation: result.reservation });
  }

  const [updated] = await db
    .update(reservation)
    .set({ specialRequests, updatedAt: new Date() })
    .where(and(eq(reservation.id, id), eq(reservation.restaurantId, auth.session.restaurantId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ reservation: updated });
}
