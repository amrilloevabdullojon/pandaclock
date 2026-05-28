import Link from "next/link";
import { Button } from "@pandaclock/ui";

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative">
        <span
          className="bg-gradient-primary absolute -inset-8 -z-10 rounded-full opacity-20 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="bg-card flex h-32 w-32 items-center justify-center rounded-full text-7xl shadow-xl"
          aria-hidden="true"
        >
          🐼
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-primary-500 text-7xl font-extrabold tracking-tight">404</p>
        <h1 className="text-foreground text-2xl font-bold">Страница не найдена</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Возможно, ссылка устарела или вы ввели адрес с опечаткой. Панда не нашла такую страницу.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">На дашборд</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </main>
  );
}
