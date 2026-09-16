import type { EmailSender } from "./types";

export const consoleEmailSender: EmailSender = {
  async send({ to, subject, html, text, attachments }) {
    const attachmentsLine = attachments?.length ? `\nAdjuntos: ${attachments.map((a) => a.filename).join(", ")}` : "";
    console.log(
      `\n--- EMAIL (consola) ---\nPara: ${to}\nAsunto: ${subject}\n\n${text ?? html}${attachmentsLine}\n-----------------------\n`,
    );
  },
};
