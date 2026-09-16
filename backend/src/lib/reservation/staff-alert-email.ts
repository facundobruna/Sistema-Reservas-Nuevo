import { DateTime } from "luxon";

export type StaffAlertEmailData = {
  type: "staff_new" | "staff_cancelled";
  restaurantName: string;
  restaurantTimezone: string;
  startsAt: Date;
  partySize: number;
  customerName: string | null;
  customerPhone: string;
};

export type StaffAlertEmailContent = { subject: string; html: string; text: string };

export function buildStaffAlertEmail(data: StaffAlertEmailData): StaffAlertEmailContent {
  const local = DateTime.fromJSDate(data.startsAt).setZone(data.restaurantTimezone).setLocale("es");
  const dateLabel = local.toFormat("cccc d LLL");
  const timeLabel = local.toFormat("HH:mm");
  const name = data.customerName || "Sin nombre";
  const peopleLabel = data.partySize === 1 ? "1 persona" : `${data.partySize} personas`;

  const intro =
    data.type === "staff_new"
      ? `Nueva reserva de <strong>${name}</strong>`
      : `<strong>${name}</strong> canceló su reserva`;
  const introText = data.type === "staff_new" ? `Nueva reserva de ${name}` : `${name} canceló su reserva`;

  return {
    subject:
      data.type === "staff_new"
        ? `Nueva reserva: ${name} (${peopleLabel}) — ${dateLabel} ${timeLabel}`
        : `Cancelación: ${name} (${peopleLabel}) — ${dateLabel} ${timeLabel}`,
    html: [
      `<p>${intro} para el <strong>${dateLabel}</strong> a las <strong>${timeLabel}</strong>, ${peopleLabel}.</p>`,
      `<p>Teléfono: ${data.customerPhone}</p>`,
    ].join(""),
    text: `${introText} para el ${dateLabel} a las ${timeLabel}, ${peopleLabel}. Teléfono: ${data.customerPhone}`,
  };
}
