import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getCustomerByPhone } from "@/db/customer";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { getEmailSender } from "@/lib/email";
import { magicLinkRequestSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const parsed = magicLinkRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Respuesta siempre genérica: no revelamos si el teléfono existe o no.
  const customer = await getCustomerByPhone(db, parsed.data.phone);
  if (customer?.email) {
    const token = createMagicLinkToken(customer.id);
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const link = `${appUrl}/api/v1/auth/diner/verify?token=${encodeURIComponent(token)}`;

    await getEmailSender().send({
      to: customer.email,
      subject: "Tu acceso a Sistema de Reservas",
      html: `<p>Entrá a tus reservas con este link (vale 15 minutos):</p><p><a href="${link}">${link}</a></p>`,
      text: `Entrá a tus reservas: ${link} (vale 15 minutos)`,
    });
  }

  return NextResponse.json({ ok: true });
}
