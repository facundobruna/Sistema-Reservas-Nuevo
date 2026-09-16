import { DateTime } from "luxon";
import { decodeSignedToken, encodeSignedToken } from "@/lib/auth/signed-token";

/**
 * Token del feed iCal del restaurante (suscripción de calendario, sin login).
 * Pensado para durar indefinidamente (un cliente de calendario lo va a poder
 * seguir consultando por años) — el primitivo compartido exige un `exp`
 * numérico, así que se usa una fecha muy lejana en vez de "sin vencimiento".
 * `v` (versión) permite invalidar links viejos sin rotar el secreto HMAC
 * entero: "regenerar" simplemente sube `settings.calendarTokenVersion`.
 */
export type CalendarTokenPayload = {
  restaurantId: string;
  v: number;
  exp: number;
};

const FAR_FUTURE_YEARS = 50;

export function createCalendarToken(restaurantId: string, tokenVersion: number): string {
  const exp = Math.floor(DateTime.now().plus({ years: FAR_FUTURE_YEARS }).toSeconds());
  return encodeSignedToken<CalendarTokenPayload>({ restaurantId, v: tokenVersion, exp });
}

export function verifyCalendarToken(token: string): CalendarTokenPayload | null {
  return decodeSignedToken<CalendarTokenPayload>(token);
}
