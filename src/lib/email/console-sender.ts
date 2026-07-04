import type { EmailSender } from "./types";

export const consoleEmailSender: EmailSender = {
  async send({ to, subject, html, text }) {
    console.log(
      `\n--- EMAIL (consola) ---\nPara: ${to}\nAsunto: ${subject}\n\n${text ?? html}\n-----------------------\n`,
    );
  },
};
