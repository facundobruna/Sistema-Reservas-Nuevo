import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { scheduleException } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { exceptionCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(scheduleException)
    .where(eq(scheduleException.restaurantId, auth.session.restaurantId))
    .orderBy(asc(scheduleException.date));

  return NextResponse.json({ exceptions: rows });
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const parsed = exceptionCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db
    .insert(scheduleException)
    .values({ restaurantId: auth.session.restaurantId, ...parsed.data })
    .returning();

  return NextResponse.json({ exception: created }, { status: 201 });
}
