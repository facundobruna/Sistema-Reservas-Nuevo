import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { seatingUnit } from "@/db/schema";
import { updateCombo } from "@/db/seating-unit";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { seatingUnitComboUpdateSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = seatingUnitComboUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await updateCombo(db, auth.session.restaurantId, id, parsed.data);
  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ seatingUnit: result.seatingUnit });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const [deleted] = await db
    .delete(seatingUnit)
    .where(
      and(
        eq(seatingUnit.id, id),
        eq(seatingUnit.restaurantId, auth.session.restaurantId),
        eq(seatingUnit.kind, "combo"),
      ),
    )
    .returning();

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
