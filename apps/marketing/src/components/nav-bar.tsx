import Link from "next/link";
import { Button } from "@pandaclock/ui";
import { APP_LOGIN_URL, APP_REGISTER_URL } from "@/lib/app-urls";

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-neutral-900">
          <span aria-hidden="true">🐼</span>
          Pandaclock
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-neutral-600 md:flex">
          <Link href="#features" className="hover:text-primary-500">
            Возможности
          </Link>
          <Link href="#pricing" className="hover:text-primary-500">
            Тарифы
          </Link>
          <Link href="#industries" className="hover:text-primary-500">
            Для бизнеса
          </Link>
          <Link href="#faq" className="hover:text-primary-500">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <a href={APP_LOGIN_URL}>Войти</a>
          </Button>
          <Button asChild size="sm">
            <a href={APP_REGISTER_URL}>Начать бесплатно</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
