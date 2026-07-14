import { decodeSignedToken, encodeSignedToken } from "@/lib/auth/signed-token";

/**
 * Token para confirmar/cancelar una reserva desde el link de un email, sin login.
 * A diferencia del magic link (TTL fijo corto), el vencimiento queda atado al
 * horario de la reserva — tiene que seguir siendo válido hasta público minutos
 * después de que el servicio termine, no un rato fijo desde que se mandó el mail.
 */
export type ReservationActionPayload = {
  reservationId: string;
  exp: number;
};

export function createReservationActionToken(reservationId: string, expiresAt: Date): string {
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return encodeSignedToken<ReservationActionPayload>({ reservationId, exp });
}

export function verifyReservationActionToken(token: string): ReservationActionPayload | null {
  return decodeSignedToken<ReservationActionPayload>(token);
}
