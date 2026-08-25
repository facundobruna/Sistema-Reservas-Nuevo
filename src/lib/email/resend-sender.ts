import type { EmailSender, SendEmailParams } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";

/** Sin SDK: un fetch directo contra la API de Resend alcanza para lo que necesitamos. */
export function createResendSender(apiKey: string, from: string): EmailSender {
  return {
    async send({ to, subject, html, text, attachments }: SendEmailParams) {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html, text, attachments }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Resend respondió ${res.status}: ${body}`);
      }
    },
  };
}
