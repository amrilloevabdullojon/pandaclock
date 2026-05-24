import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 px-6 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-neutral-900">
            <span aria-hidden="true">🐼</span> Pandaclock
          </Link>
          <p className="mt-3 text-sm text-neutral-500">HR-система, которая работает за вас.</p>
        </div>

        <FooterCol
          title="Продукт"
          links={[
            { label: "Возможности", href: "#features" },
            { label: "Тарифы", href: "#pricing" },
            { label: "Безопасность", href: "/security" },
          ]}
        />
        <FooterCol
          title="Компания"
          links={[
            { label: "О нас", href: "/about" },
            { label: "Блог", href: "/blog" },
            { label: "Контакты", href: "mailto:hello@pandaclock.uz" },
          ]}
        />
        <FooterCol
          title="Поддержка"
          links={[
            { label: "FAQ", href: "#faq" },
            { label: "Документация", href: "/docs" },
            { label: "Связаться", href: "mailto:support@pandaclock.uz" },
          ]}
        />
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-6 text-sm text-neutral-500 md:flex-row">
        <p>© 2026 Pandaclock LLC. Все права защищены.</p>
        <div className="flex gap-6">
          <Link href="/legal/oferta">Оферта</Link>
          <Link href="/legal/privacy">Политика ПД</Link>
          <Link href="/legal/dpa">DPA</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-700">
        {title}
      </h4>
      <ul className="space-y-2 text-sm text-neutral-500">
        {links.map(({ label, href }) => (
          <li key={href}>
            <Link href={href} className="hover:text-primary-500">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
