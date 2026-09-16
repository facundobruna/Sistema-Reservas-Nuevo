import { cookies } from "next/headers";
import { decodeSignedToken, encodeSignedToken } from "./signed-token";

const COOKIE_NAME = "diner_session";
// Conveniencia post-reserva (ver/cancelar sin fricción desde el mismo dispositivo).
// El regreso "desde cero" en otro dispositivo es el magic link (milestone aparte).
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

export type DinerSessionPayload = {
  customerId: string;
  exp: number;
};

export async function createDinerSession(customerId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encodeSignedToken<DinerSessionPayload>({ customerId, exp });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getDinerSession(): Promise<DinerSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSignedToken<DinerSessionPayload>(token);
}
