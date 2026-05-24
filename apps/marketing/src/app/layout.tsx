import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "@pandaclock/ui/styles";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pandaclock — HR-система, которая работает за вас",
  description:
    "Учёт времени, задачи, чаты и отчёты для вашей команды в одном понятном инструменте. Создано в Узбекистане.",
  openGraph: {
    title: "Pandaclock",
    description: "HR-система, которая работает за вас",
    locale: "ru_RU",
    type: "website",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={nunito.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
