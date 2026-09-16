import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { service, shift, zone } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { shiftCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(shift)
    .where(eq(shift.restaurantId, auth.session.restaurantId))
    .orderBy(asc(shift.dayOfWeek), asc(shift.startTime));

  return NextResponse.json({ shifts: rows });
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const parsed = shiftCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { serviceId, zoneId, ...rest } = parsed.data;

  const [ownedService] = await db
    .select({ id: service.id })
    .from(service)
    .where(and(eq(service.id, serviceId), eq(service.restaurantId, auth.session.restaurantId)))
    .limit(1);
  if (!ownedService) {
    return NextResponse.json({ error: "invalid_input", details: "serviceId no pertenece a este restaurante" }, { status: 400 });
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

  const [created] = await db
    .insert(shift)
    .values({ restaurantId: auth.session.restaurantId, serviceId, zoneId: zoneId ?? null, ...rest })
    .returning();

  return NextResponse.json({ shift: created }, { status: 201 });
}
