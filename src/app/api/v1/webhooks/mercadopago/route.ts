import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { subscription } from "@/db/schema";
import { updateSubscriptionFromMp } from "@/db/subscription";
import {
  fetchPreapproval,
  InvalidWebhookSignatureError,
  mapMpStatusToSubscriptionStatus,
  verifyWebhookSignature,
} from "@/lib/billing/mercadopago";

/**
 * Notificaciones de Mercado Pago sobre cambios de estado de una suscripción
 * (preapproval). Nunca se aplica el body del webhook directo: siempre se
 * re-consulta el estado real vía la API antes de tocar la base — el webhook
 * solo dispara el "andá a revisar esto", no es la fuente de verdad.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

  try {
    verifyWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      console.error("[webhook mp] firma inválida:", err.reason);
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
    throw err;
  }

  // Solo nos importan los eventos de la suscripción en sí — un pago individual
  // recurrente no cambia el status que nos interesa (lo hace la propia preapproval).
  if (type !== "subscription_preapproval" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  const [existing] = await db.select().from(subscription).where(eq(subscription.mpPreapprovalId, dataId)).limit(1);
  if (!existing) {
    // Preapproval que no reconocemos (no es de este entorno/instancia) — no es un error.
    return NextResponse.json({ ok: true });
  }

  const preapproval = await fetchPreapproval(dataId);
  const mappedStatus = mapMpStatusToSubscriptionStatus(preapproval.status);
  if (mappedStatus) {
    await updateSubscriptionFromMp(db, existing.restaurantId, {
      status: mappedStatus,
      currentPeriodEnd: preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : null,
    });
  }

  return NextResponse.json({ ok: true });
}
