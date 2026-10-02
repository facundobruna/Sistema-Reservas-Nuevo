import { DateTime } from "luxon";
import type { EmailSender } from "@/lib/email/types";
import { createReservationActionToken } from "./action-token";
import { buildReservationIcs } from "./ics";
import { buildNotificationEmail } from "./notification-email";

/**
 * Lo que hace falta saber de una notificación al COMENSAL para armar y mandar
 * el mail. Tipo propio (estructural), igual que en panel-access: la fila que
 * devuelve la base cumple esta forma, pero este módulo no depende de ella.
 */
export type CustomerNotification = {
  type: "confirmation" | "reminder";
  reservationId: string;
  startsAt: Date;
  endsAt: Date;
  partySize: number;
  customerName: string | null;
  customerEmail: string;
  restaurantName: string;
  restaurantTimezone: string;
  restaurantSlug: string;
};

/**
 * Arma el mail de una notificación al comensal y lo manda con el `sender` que
 * le pasan.
 *
 * El sender entra POR PARÁMETRO a propósito. Antes esta lógica vivía dentro del
 * worker, que pedía el sender por su cuenta (`getEmailSender()`) y, peor, arranca
 * la conexión a la base y pg-boss apenas se lo importa: no había forma de
 * ejecutarla en un test sin mandar mails reales y levantar infraestructura.
 * Recibiendo el sender desde afuera, producción le pasa el de verdad (Resend o
 * consola) y un test le pasa un doble que registra qué se le pidió mandar.
 *
 * Lo que NO hace, a propósito: marcar la notificación como enviada o fallida.
 * Eso es persistencia y sigue en el worker. Si `sender.send` falla, el error
 * sube tal cual para que el worker decida qué hacer (reintentar).
 */
export async function sendCustomerNotification(
  sender: EmailSender,
  n: CustomerNotification,
  appUrl: string,
): Promise<void> {
  // Vence un rato después de que termina la reserva — no un TTL fijo corto
  // como el magic link, tiene que seguir sirviendo hasta público tarde.
  const tokenExpiresAt = DateTime.fromJSDate(n.endsAt).plus({ hours: 2 }).toJSDate();
  const actionToken = createReservationActionToken(n.reservationId, tokenExpiresAt);
  const cancelUrl = `${appUrl}/r/${n.restaurantSlug}/reservations/${n.reservationId}/cancel?token=${actionToken}`;
  // "Confirmo que voy" solo tiene sentido ofrecerlo en el recordatorio, no
  // apenas se reserva (recién se está pidiendo confirmarla otra vez).
  const confirmUrl =
    n.type === "reminder"
      ? `${appUrl}/api/v1/r/${n.restaurantSlug}/reservations/${n.reservationId}/confirm?token=${actionToken}`
      : undefined;

  const content = buildNotificationEmail({
    type: n.type,
    restaurantName: n.restaurantName,
    restaurantTimezone: n.restaurantTimezone,
    startsAt: n.startsAt,
    partySize: n.partySize,
    customerName: n.customerName,
    confirmUrl,
    cancelUrl,
  });

  // El .ics solo tiene sentido en la confirmación — el recordatorio no necesita repetirlo.
  const attachments =
    n.type === "confirmation"
      ? [
          {
            filename: "reserva.ics",
            content: Buffer.from(
              buildReservationIcs({
                reservationId: n.reservationId,
                restaurantName: n.restaurantName,
                startsAt: n.startsAt,
                endsAt: n.endsAt,
                partySize: n.partySize,
              }),
              "utf-8",
            ).toString("base64"),
          },
        ]
      : undefined;

  await sender.send({ to: n.customerEmail, ...content, attachments });
}
