import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { zone } from "@/db/schema";
import { updateMesa, deleteMesa } from "@/db/mesa";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { mesaUpdateSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = mesaUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.zoneId) {
    const [ownedZone] = await db
      .select({ id: zone.id })
      .from(zone)
      .where(and(eq(zone.id, parsed.data.zoneId), eq(zone.restaurantId, auth.session.restaurantId)))
      .limit(1);
    if (!ownedZone) {
      return NextResponse.json({ error: "invalid_input", details: "zoneId no pertenece a este restaurante" }, { status: 400 });
    }
  }

  const updated = await updateMesa(db, auth.session.restaurantId, id, parsed.data);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ mesa: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const deleted = await deleteMesa(db, auth.session.restaurantId, id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
