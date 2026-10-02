import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailSender } from "@/lib/email/types";
import { verifyReservationActionToken } from "@/lib/reservation/action-token";
import {
  sendCustomerNotification,
  type CustomerNotification,
} from "@/lib/reservation/send-customer-notification";

const APP_URL = "https://reservas.test";

const notificacion: CustomerNotification = {
  type: "confirmation",
  reservationId: "res-123",
  startsAt: new Date("2026-07-20T23:00:00.000Z"),
  endsAt: new Date("2026-07-21T00:30:00.000Z"),
  partySize: 4,
  customerName: "Ana",
  customerEmail: "ana@example.com",
  restaurantName: "La Parrilla",
  restaurantTimezone: "America/Argentina/Buenos_Aires",
  restaurantSlug: "la-parrilla",
};

/**
 * Un sender de mentira: no manda ningún mail. `send` es un mock (vi.fn): registra cada
 * llamada, y los tests miran después qué se le pidió. Responde "ok" siempre (eso es la
 * parte de stub); lo que lo hace mock es que el test verifica CÓMO lo llamaron.
 */
function crearSenderFalso() {
  const send = vi.fn<EmailSender["send"]>().mockResolvedValue(undefined);
  const sender: EmailSender = { send };
  return { sender, send };
}

describe("sendCustomerNotification: el mail que le llega al comensal", () => {
  // Reloj congelado ANTES de que termine la reserva de prueba (termina el 21/07 a las 00:30 UTC).
  // El token vence 2 horas después de ese fin: sin esto, el test pasaría hasta esa fecha y
  // fallaría el día siguiente, porque verificar un token ya vencido da null.
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secreto-solo-para-tests");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T22:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("confirmación: manda un solo mail al comensal, con el .ics adjunto y link de cancelar, sin link de confirmar", async () => {
    // Arrange
    const { sender, send } = crearSenderFalso();

    // Act
    await sendCustomerNotification(sender, { ...notificacion, type: "confirmation" }, APP_URL);

    // Assert
    expect(send).toHaveBeenCalledTimes(1);
    const [mail] = send.mock.calls[0];
    expect(mail.to).toBe("ana@example.com");
    expect(mail.attachments?.map((adjunto) => adjunto.filename)).toEqual(["reserva.ics"]);
    expect(mail.html).toContain(`${APP_URL}/r/la-parrilla/reservations/res-123/cancel?token=`);
    expect(mail.html).not.toContain("/confirm?token=");
  });

  it("recordatorio: incluye el link de «confirmo que voy» y no adjunta el .ics", async () => {
    // Arrange
    const { sender, send } = crearSenderFalso();

    // Act
    await sendCustomerNotification(sender, { ...notificacion, type: "reminder" }, APP_URL);

    // Assert
    const [mail] = send.mock.calls[0];
    expect(mail.html).toContain(`${APP_URL}/api/v1/r/la-parrilla/reservations/res-123/confirm?token=`);
    expect(mail.attachments).toBeUndefined();
  });

  it("el link de cancelar lleva un token válido de esa reserva, que vence 2 horas después de que termina", async () => {
    // Arrange
    const { sender, send } = crearSenderFalso();

    // Act
    await sendCustomerNotification(sender, notificacion, APP_URL);

    // Assert
    const [mail] = send.mock.calls[0];
    const token = /cancel\?token=([^"]+)"/.exec(mail.html)?.[1];
    expect(token).toBeDefined();
    const dosHorasDespuesDelFin = new Date("2026-07-21T02:30:00.000Z").getTime() / 1000;
    expect(verifyReservationActionToken(token!)).toEqual({ reservationId: "res-123", exp: dosHorasDespuesDelFin });
  });

  it("si el servicio de mails falla, el error sube tal cual (el worker decide reintentar)", async () => {
    // Arrange
    const { sender, send } = crearSenderFalso();
    send.mockRejectedValueOnce(new Error("servicio de mails caído"));

    // Act
    const envio = sendCustomerNotification(sender, notificacion, APP_URL);

    // Assert
    await expect(envio).rejects.toThrow("servicio de mails caído");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
