import Link from "next/link";
import { Button } from "@pandaclock/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="mb-4 text-6xl">🐼</div>
      <h1 className="mb-2 text-3xl font-extrabold text-neutral-900">404 — страница не найдена</h1>
      <p className="mb-6 text-neutral-500">Кажется, Pandi заблудился. Вернёмся домой?</p>
      <Button asChild>
        <Link href="/">На главную</Link>
      </Button>
    </main>
  );
}
