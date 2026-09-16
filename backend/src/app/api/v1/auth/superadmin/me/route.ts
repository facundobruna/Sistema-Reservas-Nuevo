import { NextResponse } from "next/server";
import { requireSuperadminSession } from "@/lib/auth/require-superadmin";

export const dynamic = "force-dynamic";

/** Igual que /auth/staff/me, pero para la cookie `superadmin_session`. */
export async function GET() {
  const auth = await requireSuperadminSession();
  if ("error" in auth) return auth.error;

  const { superadminId, email } = auth.session;
  return NextResponse.json({ session: { superadminId, email } });
}
