import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { seatingUnit, seatingUnitMesa } from "@/db/schema";
import { createCombo } from "@/db/seating-unit";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { seatingUnitComboCreateSchema } from "@/lib/validation/admin";

export async function GET(request: Request) {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  // `all=true`: todas las unidades (single + combo) — para pickers como
  // reasignar mesa en la agenda. Por default, solo combos (config de M3).
  const includeAll = new URL(request.url).searchParams.get("all") === "true";
  const kindFilter = includeAll ? undefined : eq(seatingUnit.kind, "combo");

  const units = await db
    .select()
    .from(seatingUnit)
    .where(
      kindFilter
        ? and(eq(seatingUnit.restaurantId, auth.session.restaurantId), kindFilter)
        : eq(seatingUnit.restaurantId, auth.session.restaurantId),
    )
    .orderBy(asc(seatingUnit.name));

  const unitIds = units.map((c) => c.id);
  const links = unitIds.length
    ? await db
        .select({ seatingUnitId: seatingUnitMesa.seatingUnitId, mesaId: seatingUnitMesa.mesaId })
        .from(seatingUnitMesa)
        .where(inArray(seatingUnitMesa.seatingUnitId, unitIds))
    : [];

  const mesaIdsByUnit = new Map<string, string[]>();
  for (const link of links) {
    const list = mesaIdsByUnit.get(link.seatingUnitId) ?? [];
    list.push(link.mesaId);
    mesaIdsByUnit.set(link.seatingUnitId, list);
  }

  return NextResponse.json({
    seatingUnits: units.map((c) => ({ ...c, mesaIds: mesaIdsByUnit.get(c.id) ?? [] })),
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
