import { consoleEmailSender } from "./console-sender";
import { createResendSender } from "./resend-sender";
import type { EmailSender } from "./types";

let cached: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (cached) return cached;

  if (process.env.EMAIL_PROVIDER === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("RESEND_API_KEY y EMAIL_FROM son requeridos cuando EMAIL_PROVIDER=resend");
    }
    cached = createResendSender(apiKey, from);
  } else {
    cached = consoleEmailSender;
  }

  return cached;
}

export type { EmailSender, SendEmailParams } from "./types";
