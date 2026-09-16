import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { scheduleException } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { exceptionUpdateSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = exceptionUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(scheduleException)
    .set(parsed.data)
    .where(and(eq(scheduleException.id, id), eq(scheduleException.restaurantId, auth.session.restaurantId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ exception: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const [deleted] = await db
    .delete(scheduleException)
    .where(and(eq(scheduleException.id, id), eq(scheduleException.restaurantId, auth.session.restaurantId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
