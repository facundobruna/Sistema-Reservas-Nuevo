import { MercadoPagoConfig, PreApproval, WebhookSignatureValidator } from "mercadopago";
import type { Subscription } from "@/db/subscription";

/**
 * Único cliente MP de la plataforma: los restaurantes le pagan A LA
 * plataforma por usar el software (suscripción B2B). No hay ningún flujo
 * de pago del comensal acá — eso sigue prohibido por la spec del producto.
 */
function getConfig(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN no está definida (revisá tu .env)");
  return new MercadoPagoConfig({ accessToken });
}

export function getMonthlyPriceArs(): number {
  const raw = process.env.SUBSCRIPTION_PRICE_ARS;
  const price = raw ? Number(raw) : NaN;
  if (!raw || Number.isNaN(price) || price <= 0) {
    throw new Error("SUBSCRIPTION_PRICE_ARS no está definida o no es un número válido (revisá tu .env)");
  }
  return price;
}

export type CheckoutResult = { preapprovalId: string; initPoint: string };

/** Crea la suscripción (preapproval) en Mercado Pago y devuelve el link para autorizarla. */
export async function createSubscriptionCheckout(params: {
  payerEmail: string;
  restaurantSlug: string;
  backUrl: string;
}): Promise<CheckoutResult> {
  const preApproval = new PreApproval(getConfig());
  const response = await preApproval.create({
    body: {
      reason: "Suscripción Sistema de Reservas",
      external_reference: params.restaurantSlug,
      payer_email: params.payerEmail,
      back_url: params.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: getMonthlyPriceArs(),
        currency_id: "ARS",
      },
      status: "pending",
    },
  });

  if (!response.id || !response.init_point) {
    throw new Error("Mercado Pago no devolvió id/init_point al crear la suscripción");
  }
  return { preapprovalId: response.id, initPoint: response.init_point };
}

/** Estado real y autoritativo de una suscripción — nunca confiamos en el body del webhook, siempre se re-consulta acá. */
export async function fetchPreapproval(preapprovalId: string) {
  const preApproval = new PreApproval(getConfig());
  return preApproval.get({ id: preapprovalId });
}

/** Mapea el status de Mercado Pago al nuestro. `null` si es un estado que no cambia nada (ej. "pending" inicial). */
export function mapMpStatusToSubscriptionStatus(mpStatus: string | undefined): Subscription["status"] | null {
  switch (mpStatus) {
    case "authorized":
      return "active";
    case "paused":
      return "past_due";
    case "cancelled":
      return "canceled";
    default:
      return null;
  }
}

/**
 * Verifica la firma del webhook (HMAC sobre id+request-id+ts, formato documentado
 * de Mercado Pago). Tira si es inválida o si faltan MP_WEBHOOK_SECRET.
 * Igual, nunca aplicamos el body del webhook directo: siempre se re-consulta
 * el preapproval real vía fetchPreapproval antes de tocar la base.
 */
export function verifyWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): void {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) throw new Error("MP_WEBHOOK_SECRET no está definida (revisá tu .env)");

  WebhookSignatureValidator.validate({
    xSignature: params.xSignature,
    xRequestId: params.xRequestId,
    dataId: params.dataId,
    secret,
    toleranceSeconds: 300,
  });
}

export { InvalidWebhookSignatureError } from "mercadopago";
