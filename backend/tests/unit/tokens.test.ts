import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeSignedToken } from "@/lib/auth/signed-token";
import { createReservationActionToken, verifyReservationActionToken } from "@/lib/reservation/action-token";

const UNA_HORA_MS = 60 * 60 * 1000;

describe("token firmado de acción sobre una reserva", () => {
  // La firma depende de AUTH_SECRET. Se fija acá para que el test no dependa del .env
  // de nadie (el pipeline no tiene uno) y se restaura al terminar cada test.
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secreto-solo-para-tests");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("un token recién creado se verifica y devuelve la reserva que firmó", () => {
    // Arrange
    const venceEn = new Date(Date.now() + UNA_HORA_MS);
    const token = createReservationActionToken("res-123", venceEn);

    // Act
    const payload = verifyReservationActionToken(token);

    // Assert
    expect(payload).toEqual({ reservationId: "res-123", exp: Math.floor(venceEn.getTime() / 1000) });
  });

  it("rechaza un token vencido", () => {
    // Arrange
    const yaVencio = new Date(Date.now() - UNA_HORA_MS);
    const token = createReservationActionToken("res-123", yaVencio);

    // Act
    const payload = verifyReservationActionToken(token);

    // Assert
    expect(payload).toBeNull();
  });

  it("rechaza un token cuyo contenido fue alterado, aunque conserve la firma original", () => {
    // Arrange: alguien intenta usar el token de res-123 para actuar sobre otra reserva.
    const token = createReservationActionToken("res-123", new Date(Date.now() + UNA_HORA_MS));
    const [, firmaOriginal] = token.split(".");
    const contenidoAlterado = Buffer.from(
      JSON.stringify({ reservationId: "res-OTRA", exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");

    // Act
    const payload = verifyReservationActionToken(`${contenidoAlterado}.${firmaOriginal}`);

    // Assert
    expect(payload).toBeNull();
  });

  it.each([
    ["vacío", ""],
    ["sin punto separador", "sinseparador"],
    ["sin contenido", ".solofirma"],
    ["sin firma", "solocontenido."],
  ])("rechaza un token mal formado: %s", (_descripcion, token) => {
    // Act
    const payload = verifyReservationActionToken(token);

    // Assert
    expect(payload).toBeNull();
  });

  it("sin AUTH_SECRET no firma nada: falla en vez de firmar con una clave vacía", () => {
    // Arrange
    vi.stubEnv("AUTH_SECRET", "");

    // Act
    const firmar = () => encodeSignedToken({ exp: 1 });

    // Assert
    expect(firmar).toThrow(/AUTH_SECRET/);
  });
});
