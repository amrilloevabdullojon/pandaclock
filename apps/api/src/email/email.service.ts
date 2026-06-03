import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { createTransport, type Transporter } from "nodemailer";
import {
  renderEmailVerification,
  renderEmployeeInvite,
  renderLoginAlert,
  renderPasswordReset,
  renderWelcomeEmail,
} from "./templates.js";

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

  /**
   * Отправка письма. НИКОГДА не бросает исключение — email не должен ронять
   * бизнес-флоу (логин, инвайт, заявка). Если Resend в test-mode (домен не
   * верифицирован) или транспорт недоступен — просто логируем и идём дальше.
   * Возвращает true при успехе, false при ошибке (callers могут учесть).
   */
  async send({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
    try {
      if (this.resend) {
        const { error } = await this.resend.emails.send({
          from: this.from,
          to,
          subject,
          html,
          text,
        });
        if (error) {
          this.logger.warn({ error, to, subject }, "Resend send failed (non-fatal)");
          return false;
        }
      } else if (this.smtp) {
        await this.smtp.sendMail({ from: this.from, to, subject, html, text });
      } else {
        this.logger.warn({ to, subject }, "No email transport configured — message dropped");
        return false;
      }
      this.logger.log({ to, subject }, "email sent");
      return true;
    } catch (err) {
      this.logger.warn({ err, to, subject }, "email send threw (non-fatal)");
      return false;
    }
  }

  sendWelcome(params: {
    to: string;
    firstName: string;
    verificationUrl: string;
  }): Promise<boolean> {
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
  }): Promise<boolean> {
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
  }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: "🔐 Новый вход в ваш аккаунт Pandaclock",
      html: renderLoginAlert(params),
    });
  }

  sendPasswordReset(params: { to: string; firstName: string; resetUrl: string }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: "Восстановление пароля Pandaclock",
      html: renderPasswordReset(params),
    });
  }

  sendEmployeeInvite(params: {
    to: string;
    inviterName: string;
    tenantName: string;
    inviteUrl: string;
  }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: `Приглашение в команду ${params.tenantName} — Pandaclock`,
      html: renderEmployeeInvite(params),
    });
  }
}
