"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@pandaclock/ui";
import { Stepper } from "./_components/stepper";
import { CompanyStep, type CompanyData } from "./_components/company-step";
import { AdminStep, type AdminData } from "./_components/admin-step";
import { InviteStep } from "./_components/invite-step";
import { DoneStep } from "./_components/done-step";

type Step = 1 | 2 | 3 | 4;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Маппинг API error code → понятное сообщение. Контракт ответа { code, message }
 * (см. apps/api/src/observability/sentry.filter.ts).
 */
function registerErrorMessage(code: string | undefined): {
  message: string;
  backToStep?: Step;
} {
  switch (code) {
    case "TENANT_SLUG_TAKEN":
      return { message: "Этот адрес компании уже занят. Выберите другой.", backToStep: 1 };
    case "SLUG_RESERVED":
      return { message: "Этот адрес зарезервирован системой. Выберите другой.", backToStep: 1 };
    case "INVALID_SLUG":
      return {
        message: "Адрес: 3–31 латинских букв/цифр/дефисов, начало с буквы.",
        backToStep: 1,
      };
    case "INVALID_INPUT":
      return { message: "Проверьте что все поля заполнены правильно." };
    case "RATE_LIMITED":
      return {
        message: "Слишком много попыток регистрации. Подождите час и попробуйте снова.",
      };
    default:
      return { message: "Не удалось создать компанию. Попробуйте позже." };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(company: CompanyData, admin: AdminData): Promise<boolean> {
    setError(null);
    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.companyName,
          slug: company.slug,
          industry: company.industry,
          adminFirstName: admin.firstName,
          adminLastName: admin.lastName,
          adminEmail: admin.email,
          adminPhone: admin.phone,
          adminPassword: admin.password,
        }),
      });
    } catch {
      setError("Нет связи с сервером. Проверьте интернет.");
      return false;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { code?: string };
      const { message, backToStep } = registerErrorMessage(body.code);
      setError(message);
      if (backToStep) setStep(backToStep);
      return false;
    }
    const data = (await response.json()) as { tenant: { slug: string } };
    setTenantSlug(data.tenant.slug);

    // Auto-login через web-proxy — сразу выставит cookies и юзер попадёт на dashboard
    // без второго ввода пароля. Если не получилось — не страшно, на DoneStep
    // есть кнопка «Войти».
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: admin.email,
          password: admin.password,
          tenant: data.tenant.slug,
        }),
      });
    } catch {
      // silent
    }

    return true;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12">
      <div className="w-full max-w-2xl">
        <Stepper current={step} steps={["Компания", "Админ", "Команда", "Готово"]} />
        <Card className="mt-6">
          <CardContent className="p-8">
            {error ? (
              <p
                className="border-danger/40 bg-danger-light text-danger mb-4 rounded-md border px-4 py-3 text-sm"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {step === 1 ? (
              <CompanyStep
                initial={companyData}
                onSubmit={(data) => {
                  setCompanyData(data);
                  setStep(2);
                }}
              />
            ) : null}

            {step === 2 && companyData ? (
              <AdminStep
                initial={adminData}
                onBack={() => setStep(1)}
                onSubmit={(data) => {
                  setAdminData(data);
                  setStep(3);
                }}
              />
            ) : null}

            {step === 3 && companyData && adminData ? (
              <InviteStep
                onBack={() => setStep(2)}
                onSkip={async () => {
                  const ok = await submit(companyData, adminData);
                  if (ok) setStep(4);
                }}
                onSubmit={async () => {
                  const ok = await submit(companyData, adminData);
                  if (ok) setStep(4);
                }}
              />
            ) : null}

            {step === 4 && tenantSlug ? (
              <DoneStep
                tenantSlug={tenantSlug}
                adminEmail={adminData?.email ?? ""}
                onLogin={() => {
                  // Auto-login уже выставил cookies — идём сразу в dashboard.
                  // Если что-то пошло не так — middleware вернёт на /login.
                  router.push("/dashboard");
                  router.refresh();
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
