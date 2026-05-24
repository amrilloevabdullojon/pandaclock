import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@pandaclock/ui";

export default function HomePage() {
  const t = useTranslations("home");
  const common = useTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-primary-50 to-white px-6">
      <div className="max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-pill bg-primary-100 px-4 py-2 text-sm font-semibold text-primary-700">
          🐼 {common("appName")}
        </div>
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-neutral-900 md:text-6xl">
          {t("comingSoon")}
        </h1>
        <p className="mb-8 text-lg text-neutral-500">{t("description")}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">{common("appName")} Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
