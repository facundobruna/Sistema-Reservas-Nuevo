export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface EmailSender {
  send(params: SendEmailParams): Promise<void>;
}
