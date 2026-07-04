import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { service, shift, zone } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { shiftUpdateSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = shiftUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { serviceId, zoneId, ...rest } = parsed.data;

  if (serviceId) {
    const [ownedService] = await db
      .select({ id: service.id })
      .from(service)
      .where(and(eq(service.id, serviceId), eq(service.restaurantId, auth.session.restaurantId)))
      .limit(1);
    if (!ownedService) {
      return NextResponse.json({ error: "invalid_input", details: "serviceId no pertenece a este restaurante" }, { status: 400 });
    }
  }
  if (zoneId) {
    const [ownedZone] = await db
      .select({ id: zone.id })
      .from(zone)
      .where(and(eq(zone.id, zoneId), eq(zone.restaurantId, auth.session.restaurantId)))
      .limit(1);
    if (!ownedZone) {
      return NextResponse.json({ error: "invalid_input", details: "zoneId no pertenece a este restaurante" }, { status: 400 });
    }
  }

  const [updated] = await db
    .update(shift)
    .set({ ...rest, ...(serviceId ? { serviceId } : {}), ...(zoneId !== undefined ? { zoneId } : {}) })
    .where(and(eq(shift.id, id), eq(shift.restaurantId, auth.session.restaurantId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ shift: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const [deleted] = await db
    .delete(shift)
    .where(and(eq(shift.id, id), eq(shift.restaurantId, auth.session.restaurantId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
