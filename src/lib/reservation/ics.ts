function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export function buildReservationIcs(params: {
  reservationId: string;
  restaurantName: string;
  startsAt: Date;
  endsAt: Date;
  partySize: number;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sistema de Reservas//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${params.reservationId}@sistema-reservas`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(params.startsAt)}`,
    `DTEND:${toIcsDate(params.endsAt)}`,
    `SUMMARY:${escapeIcsText(`Reserva en ${params.restaurantName}`)}`,
    `DESCRIPTION:${escapeIcsText(`Reserva para ${params.partySize} persona(s) en ${params.restaurantName}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
