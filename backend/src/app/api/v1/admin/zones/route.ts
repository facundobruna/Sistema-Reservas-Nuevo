import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { zone } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { zoneCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(zone)
    .where(eq(zone.restaurantId, auth.session.restaurantId))
    .orderBy(asc(zone.position));

  return NextResponse.json({ zones: rows });
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const parsed = zoneCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db
    .insert(zone)
    .values({ restaurantId: auth.session.restaurantId, ...parsed.data })
    .returning();

  return NextResponse.json({ zone: created }, { status: 201 });
}
