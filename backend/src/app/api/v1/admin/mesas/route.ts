import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mesa, zone } from "@/db/schema";
import { createMesa } from "@/db/mesa";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { mesaCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(mesa)
    .where(eq(mesa.restaurantId, auth.session.restaurantId))
    .orderBy(asc(mesa.name));

  return NextResponse.json({ mesas: rows });
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const parsed = mesaCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [ownedZone] = await db
    .select({ id: zone.id })
    .from(zone)
    .where(and(eq(zone.id, parsed.data.zoneId), eq(zone.restaurantId, auth.session.restaurantId)))
    .limit(1);
  if (!ownedZone) {
    return NextResponse.json({ error: "invalid_input", details: "zoneId no pertenece a este restaurante" }, { status: 400 });
  }

  const created = await createMesa(db, { restaurantId: auth.session.restaurantId, ...parsed.data });
  return NextResponse.json({ mesa: created.mesa, seatingUnit: created.seatingUnit }, { status: 201 });
}
