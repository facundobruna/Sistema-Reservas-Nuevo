import { cookies } from "next/headers";
import { decodeSignedToken, encodeSignedToken } from "./signed-token";

const COOKIE_NAME = "staff_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

export type StaffRole = "owner" | "manager" | "host";

export type StaffSessionPayload = {
  staffId: string;
  restaurantId: string;
  restaurantSlug: string;
  role: StaffRole;
  email: string;
  /** Id del superadmin_user que abrió esta sesión por impersonación, si aplica. */
  impersonatedBy?: string;
  exp: number;
};

export async function createStaffSession(
  payload: Omit<StaffSessionPayload, "exp">,
): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encodeSignedToken<StaffSessionPayload>({ ...payload, exp });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearStaffSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getStaffSession(): Promise<StaffSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSignedToken<StaffSessionPayload>(token);
}
