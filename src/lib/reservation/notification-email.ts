import { DateTime } from "luxon";

export type NotificationEmailData = {
  type: "confirmation" | "reminder";
  restaurantName: string;
  restaurantTimezone: string;
  startsAt: Date;
  partySize: number;
  customerName: string | null;
};

export type NotificationEmailContent = { subject: string; html: string; text: string };

export function buildNotificationEmail(data: NotificationEmailData): NotificationEmailContent {
  const local = DateTime.fromJSDate(data.startsAt).setZone(data.restaurantTimezone).setLocale("es");
  const dateLabel = local.toFormat("cccc d LLL");
  const timeLabel = local.toFormat("HH:mm");
  const greeting = data.customerName ? `Hola ${data.customerName},` : "Hola,";
  const peopleLabel = data.partySize === 1 ? "1 persona" : `${data.partySize} personas`;

  const intro =
    data.type === "confirmation"
      ? `tu reserva en <strong>${data.restaurantName}</strong> quedó confirmada`
      : `te recordamos tu reserva en <strong>${data.restaurantName}</strong>`;
  const introText =
    data.type === "confirmation"
      ? `tu reserva en ${data.restaurantName} quedó confirmada`
      : `te recordamos tu reserva en ${data.restaurantName}`;

  return {
    subject:
      data.type === "confirmation"
        ? `Reserva confirmada en ${data.restaurantName}`
        : `Recordatorio: tu reserva en ${data.restaurantName}`,
    html: `<p>${greeting}</p><p>${intro} para el <strong>${dateLabel}</strong> a las <strong>${timeLabel}</strong>, para ${peopleLabel}.</p><p>¡Te esperamos!</p>`,
    text: `${greeting} ${introText} para el ${dateLabel} a las ${timeLabel}, para ${peopleLabel}. ¡Te esperamos!`,
  };
}
