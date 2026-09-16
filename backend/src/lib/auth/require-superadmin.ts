import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSuperadminSession, type SuperadminSessionPayload } from "./superadmin-session";

/** Para Route Handlers del área de superadmin. */
export async function requireSuperadminSession(): Promise<
  { session: SuperadminSessionPayload } | { error: NextResponse }
> {
  const session = await getSuperadminSession();
  if (!session) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { session };
}

/** Para Server Components del área de superadmin. */
export async function requireSuperadminPage(): Promise<SuperadminSessionPayload> {
  const session = await getSuperadminSession();
  if (!session) {
    redirect("/superadmin/login");
  }
  return session;
}
