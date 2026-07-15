import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { deleteMesaBlock } from "@/db/mesa-block";
import { requireStaffSession } from "@/lib/auth/require-staff";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager", "host"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const deleted = await deleteMesaBlock(db, auth.session.restaurantId, id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
