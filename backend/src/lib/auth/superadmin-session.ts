import { cookies } from "next/headers";
import { decodeSignedToken, encodeSignedToken } from "./signed-token";

const COOKIE_NAME = "superadmin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas — sesión corta, es acceso a todos los tenants.

export type SuperadminSessionPayload = {
  superadminId: string;
  email: string;
  exp: number;
};

export async function createSuperadminSession(payload: Omit<SuperadminSessionPayload, "exp">): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encodeSignedToken<SuperadminSessionPayload>({ ...payload, exp });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSuperadminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSuperadminSession(): Promise<SuperadminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSignedToken<SuperadminSessionPayload>(token);
}
