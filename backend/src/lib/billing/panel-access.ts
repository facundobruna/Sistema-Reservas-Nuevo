/**
 * Regla de negocio: ¿se le bloquea el panel al staff de un restaurante?
 *
 * Vive acá y no en db/subscription.ts a propósito: es una DECISIÓN, no una
 * consulta. No necesita saber de dónde salen los datos (Postgres, un test, un
 * JSON); solo recibirlos y devolver un veredicto. Sin imports de la base, se
 * puede ejecutar y verificar sin levantar nada — por eso es testeable.
 */

export type PanelAccess = "ok" | "trial_expired" | "payment_required" | "suspended";

/**
 * Lo mínimo que la regla necesita saber de una suscripción. Es un tipo propio
 * (estructural) en vez de importar el de Drizzle: la fila completa de la base
 * cumple esta forma, así que se la puede pasar tal cual, pero la regla no
 * queda atada al esquema.
 */
export type PanelAccessSubscription = {
  status: "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: Date | null;
};

/**
 * Única fuente de verdad de si el panel del staff se bloquea. El flujo del
 * comensal (/r/{slug} y sus APIs) NUNCA llama a esto — el bloqueo es
 * exclusivo del panel, la reserva del comensal no se toca pase lo que pase.
 */
export function evaluatePanelAccess(params: {
  suspendedAt: Date | null;
  subscription: PanelAccessSubscription | null;
}): PanelAccess {
  if (params.suspendedAt) return "suspended";

  const sub = params.subscription;
  if (!sub) return "payment_required";

  if (sub.status === "active") return "ok";
  if (sub.status === "trialing") {
    if (sub.trialEndsAt && sub.trialEndsAt.getTime() < Date.now()) return "trial_expired";
    return "ok";
  }
  return "payment_required"; // past_due | canceled
}
