function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

type IcsEvent = {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description: string;
};

function buildVEvent(event: IcsEvent): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}@sistema-reservas`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.startsAt)}`,
    `DTEND:${toIcsDate(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    "END:VEVENT",
  ];
}

function wrapVCalendar(vevents: string[][]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sistema de Reservas//ES", "CALSCALE:GREGORIAN", ...vevents.flat(), "END:VCALENDAR"].join(
    "\r\n",
  );
}

/** El .ics adjunto al email de confirmación de UNA reserva (para el comensal). */
export function buildReservationIcs(params: {
  reservationId: string;
  restaurantName: string;
  startsAt: Date;
  endsAt: Date;
  partySize: number;
}): string {
  return wrapVCalendar([
    buildVEvent({
      uid: params.reservationId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      summary: `Reserva en ${params.restaurantName}`,
      description: `Reserva para ${params.partySize} persona(s) en ${params.restaurantName}`,
    }),
  ]);
}

/** Feed de calendario del restaurante (para el staff, vía suscripción) — todas sus reservas próximas. */
export function buildCalendarFeedIcs(
  reservations: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    partySize: number;
    customerName: string | null;
    customerPhone: string;
  }[],
): string {
  return wrapVCalendar(
    reservations.map((r) => {
      const name = r.customerName || "Sin nombre";
      const peopleLabel = r.partySize === 1 ? "1 persona" : `${r.partySize} personas`;
      return buildVEvent({
        uid: r.id,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        summary: `${name} (${peopleLabel})`,
        description: `${peopleLabel} · ${r.customerPhone}`,
      });
    }),
  );
}
