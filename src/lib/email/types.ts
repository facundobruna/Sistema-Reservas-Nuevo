export type EmailAttachment = {
  filename: string;
  /** Base64. Mismo formato que espera la API de Resend, así el sender lo pasa tal cual. */
  content: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

export interface EmailSender {
  send(params: SendEmailParams): Promise<void>;
}
