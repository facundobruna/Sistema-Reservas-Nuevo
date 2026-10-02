import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluatePanelAccess, type PanelAccess, type PanelAccessSubscription } from "@/lib/billing/panel-access";

// La regla mira la fecha de hoy (Date.now()). Si el test dependiera del reloj real,
// pasaría hoy y fallaría el día que venza la fecha de prueba: un test "flaky".
// Por eso se congela el reloj: el resultado depende solo de lo que declaramos acá.
const AHORA = new Date("2026-07-20T12:00:00.000Z");
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const sub = (status: PanelAccessSubscription["status"], trialEndsAt: Date | null = null): PanelAccessSubscription => ({
  status,
  trialEndsAt,
});

describe("evaluatePanelAccess: ¿se bloquea el panel del restaurante?", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each<[string, Date | null, PanelAccessSubscription | null, PanelAccess]>([
    ["restaurante suspendido, aunque tenga suscripción activa", AHORA, sub("active"), "suspended"],
    ["sin suscripción", null, null, "payment_required"],
    ["suscripción activa", null, sub("active"), "ok"],
    ["prueba vigente (vence mañana)", null, sub("trialing", new Date(AHORA.getTime() + UN_DIA_MS)), "ok"],
    ["prueba vencida (venció ayer)", null, sub("trialing", new Date(AHORA.getTime() - UN_DIA_MS)), "trial_expired"],
    ["prueba sin fecha de vencimiento", null, sub("trialing", null), "ok"],
    ["pago atrasado (past_due)", null, sub("past_due"), "payment_required"],
    ["suscripción cancelada", null, sub("canceled"), "payment_required"],
  ])("%s", (_descripcion, suspendedAt, subscription, esperado) => {
    // Act
    const acceso = evaluatePanelAccess({ suspendedAt, subscription });

    // Assert
    expect(acceso).toBe(esperado);
  });

  it("una prueba que vence justo ahora todavía no está vencida, y un milisegundo antes sí", () => {
    // Arrange
    const venceAhora = sub("trialing", new Date(AHORA.getTime()));
    const vencioHaceUnMs = sub("trialing", new Date(AHORA.getTime() - 1));

    // Act
    const enElBorde = evaluatePanelAccess({ suspendedAt: null, subscription: venceAhora });
    const apenasPasado = evaluatePanelAccess({ suspendedAt: null, subscription: vencioHaceUnMs });

    // Assert
    expect(enElBorde).toBe("ok");
    expect(apenasPasado).toBe("trial_expired");
  });
});
