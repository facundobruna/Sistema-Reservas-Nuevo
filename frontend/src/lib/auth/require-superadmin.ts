import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api/server";
import type { SuperadminSession } from "@/lib/api/types";

/** Igual que requireStaffPage, para el área de superadmin. */
export async function requireSuperadminPage(): Promise<SuperadminSession> {
  const result = await apiGet<{ session: SuperadminSession }>("/auth/superadmin/me");

  if (!result.ok) {
    redirect("/superadmin/login");
  }

  return result.data.session;
}
