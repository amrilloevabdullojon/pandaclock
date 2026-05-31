"use client";

import { Button } from "@pandaclock/ui";

export function DoneStep({
  tenantSlug,
  adminEmail,
  onLogin,
}: {
  tenantSlug: string;
  adminEmail: string;
  onLogin: () => void;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-6xl">🎂</div>
      <div>
        <h1 className="text-3xl font-extrabold text-neutral-900">Поздравляем!</h1>
        <p className="mt-2 text-neutral-500">Ваш аккаунт {tenantSlug}.pandaclock.uz создан.</p>
      </div>

      <div className="bg-primary-50 space-y-3 rounded-lg p-4 text-left">
        <p className="text-primary-700 text-sm font-semibold">📧 Проверьте email</p>
        <p className="text-sm text-neutral-600">
          Мы отправили ссылку для подтверждения на <strong>{adminEmail}</strong>. Перейдите по ней,
          чтобы активировать аккаунт.
        </p>
      </div>

      <div className="space-y-3 rounded-lg bg-neutral-100 p-4 text-left">
        <p className="text-sm font-semibold text-neutral-700">📱 Установите приложение</p>
        <p className="text-sm text-neutral-600">
          Mobile-приложение для сотрудников — в App Store и Google Play (скоро).
        </p>
      </div>

      <Button onClick={onLogin} size="lg" fullWidth>
        Открыть дашборд →
      </Button>
    </div>
  );
}
