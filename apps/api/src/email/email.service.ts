import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { createTransport, type Transporter } from "nodemailer";
import { renderWelcomeEmail, renderEmailVerification, renderLoginAlert } from "./templates.js";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Унифицированный sender:
 * - В production используем Resend (RESEND_API_KEY задан).
 * - Локально — SMTP-транспорт (Mailpit на localhost:1025).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly resend: Resend | null;
  private readonly smtp: Transporter | null;

  constructor() {
    this.from = process.env.EMAIL_FROM ?? "noreply@pandaclock.uz";

    const resendKey = process.env.RESEND_API_KEY;
    this.resend = resendKey ? new Resend(resendKey) : null;

    this.smtp = this.resend
      ? null
      : createTransport({
          host: process.env.SMTP_HOST ?? "localhost",
          port: Number(process.env.SMTP_PORT ?? 1025),
          secure: false,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
            : undefined,
        });
  }

  async send({ to, subject, html, text }: SendEmailParams): Promise<void> {
    if (this.resend) {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        text,
      });
      if (error) {
        this.logger.error({ error, to, subject }, "Resend send failed");
        throw error;
      }
    } else if (this.smtp) {
      await this.smtp.sendMail({ from: this.from, to, subject, html, text });
    } else {
      this.logger.warn({ to, subject }, "No email transport configured — message dropped");
    }
    this.logger.log({ to, subject }, "email sent");
  }

  sendWelcome(params: { to: string; firstName: string; verificationUrl: string }): Promise<void> {
    return this.send({
      to: params.to,
      subject: "Подтвердите email для входа в Pandaclock",
      html: renderWelcomeEmail({
        firstName: params.firstName,
        verificationUrl: params.verificationUrl,
      }),
    });
  }

  sendEmailVerification(params: {
    to: string;
    firstName: string;
    verificationUrl: string;
  }): Promise<void> {
    return this.send({
      to: params.to,
      subject: "Подтвердите email Pandaclock",
      html: renderEmailVerification(params),
    });
  }

  sendLoginAlert(params: {
    to: string;
    firstName: string;
    ip: string;
    userAgent: string;
    when: Date;
  }): Promise<void> {
    return this.send({
      to: params.to,
      subject: "🔐 Новый вход в ваш аккаунт Pandaclock",
      html: renderLoginAlert(params),
    });
  }
}
