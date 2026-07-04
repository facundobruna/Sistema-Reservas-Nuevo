import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { seatingUnit, seatingUnitMesa } from "@/db/schema";
import { createCombo } from "@/db/seating-unit";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { seatingUnitComboCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const combos = await db
    .select()
    .from(seatingUnit)
    .where(and(eq(seatingUnit.restaurantId, auth.session.restaurantId), eq(seatingUnit.kind, "combo")))
    .orderBy(asc(seatingUnit.name));

  const comboIds = combos.map((c) => c.id);
  const links = comboIds.length
    ? await db
        .select({ seatingUnitId: seatingUnitMesa.seatingUnitId, mesaId: seatingUnitMesa.mesaId })
        .from(seatingUnitMesa)
        .where(inArray(seatingUnitMesa.seatingUnitId, comboIds))
    : [];

  const mesaIdsByUnit = new Map<string, string[]>();
  for (const link of links) {
    const list = mesaIdsByUnit.get(link.seatingUnitId) ?? [];
    list.push(link.mesaId);
    mesaIdsByUnit.set(link.seatingUnitId, list);
  }

  return NextResponse.json({
    seatingUnits: combos.map((c) => ({ ...c, mesaIds: mesaIdsByUnit.get(c.id) ?? [] })),
  });
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const parsed = seatingUnitComboCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createCombo(db, { restaurantId: auth.session.restaurantId, ...parsed.data });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ seatingUnit: result.seatingUnit }, { status: 201 });
}
