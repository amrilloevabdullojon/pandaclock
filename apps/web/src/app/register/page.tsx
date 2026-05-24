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

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(company: CompanyData, admin: AdminData) {
    setError(null);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register-company`, {
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
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
      if (body.error?.code === "TENANT_SLUG_TAKEN") {
        setError("Этот поддомен уже занят. Выберите другой.");
        setStep(1);
        return false;
      }
      setError("Не удалось создать аккаунт. Попробуйте позже.");
      return false;
    }
    const data = (await response.json()) as { tenant: { slug: string } };
    setTenantSlug(data.tenant.slug);
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
                className="mb-4 rounded-md border border-danger/40 bg-danger-light px-4 py-3 text-sm text-danger"
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
                onLogin={() => router.push("/login")}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
