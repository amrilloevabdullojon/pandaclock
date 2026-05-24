/**
 * Минимальные HTML-шаблоны для системных писем.
 * Полные шаблоны — в docs/Email_шаблоны.md.
 * Sprint 1 — только welcome + verification + login-alert.
 */

const LAYOUT = (content: string): string => `
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:24px;background:#FAFBFD;font-family:'Nunito',Arial,sans-serif;color:#1F2233;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;padding:32px;">
      <tr>
        <td>
          <p style="margin:0 0 24px;font-size:18px;font-weight:800;">🐼 Pandaclock</p>
          ${content}
          <hr style="border:none;border-top:1px solid #E8EAF2;margin:32px 0 16px;" />
          <p style="margin:0;font-size:12px;color:#6B7080;text-align:center;">
            🐼 Pandaclock — HR-система, которая работает за вас<br />
            <a href="https://pandaclock.uz" style="color:#5B4FE2;">pandaclock.uz</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const BUTTON = (href: string, label: string): string => `
  <p style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#5B4FE2;color:#FFFFFF;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:12px;">${label}</a>
  </p>
`;

export function renderWelcomeEmail({
  firstName,
  verificationUrl,
}: {
  firstName: string;
  verificationUrl: string;
}): string {
  return LAYOUT(`
    <p style="font-size:16px;line-height:1.6;">Здравствуйте, <strong>${escapeHtml(firstName)}</strong>!</p>
    <p style="font-size:16px;line-height:1.6;">
      Спасибо за регистрацию в Pandaclock. Чтобы завершить создание аккаунта,
      подтвердите свой email.
    </p>
    ${BUTTON(verificationUrl, "Подтвердить email")}
    <p style="font-size:14px;color:#6B7080;line-height:1.5;">
      Ссылка действительна 24 часа. Если вы не регистрировались — проигнорируйте это письмо.
    </p>
  `);
}

export function renderEmailVerification({
  firstName,
  verificationUrl,
}: {
  firstName: string;
  verificationUrl: string;
}): string {
  return LAYOUT(`
    <p style="font-size:16px;line-height:1.6;">${escapeHtml(firstName)}, подтвердите свой email для продолжения работы в Pandaclock.</p>
    ${BUTTON(verificationUrl, "Подтвердить email")}
    <p style="font-size:14px;color:#6B7080;">Ссылка действительна 24 часа.</p>
  `);
}

export function renderLoginAlert({
  firstName,
  ip,
  userAgent,
  when,
}: {
  firstName: string;
  ip: string;
  userAgent: string;
  when: Date;
}): string {
  return LAYOUT(`
    <p style="font-size:16px;line-height:1.6;">Здравствуйте, <strong>${escapeHtml(firstName)}</strong>!</p>
    <p style="font-size:16px;line-height:1.6;">Зафиксирован вход в ваш аккаунт:</p>
    <ul style="font-size:14px;color:#3D4253;line-height:1.8;">
      <li>📅 ${when.toISOString()}</li>
      <li>🌐 IP: ${escapeHtml(ip)}</li>
      <li>💻 ${escapeHtml(userAgent)}</li>
    </ul>
    <p style="font-size:14px;color:#6B7080;">
      Если это были не вы — немедленно смените пароль в настройках безопасности.
    </p>
  `);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
