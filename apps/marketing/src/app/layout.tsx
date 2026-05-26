import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import Script from "next/script";
import "@pandaclock/ui/styles";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://pandaclock.uz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pandaclock — HR-система, которая работает за вас",
    template: "%s · Pandaclock",
  },
  description:
    "Учёт времени, задачи, чаты и отчёты для вашей команды в одном понятном инструменте. Создано в Узбекистане.",
  keywords: [
    "HR система",
    "учёт рабочего времени",
    "управление сотрудниками",
    "Узбекистан",
    "SaaS",
    "Pandaclock",
  ],
  authors: [{ name: "Pandaclock", url: SITE_URL }],
  applicationName: "Pandaclock",
  openGraph: {
    title: "Pandaclock — HR-система, которая работает за вас",
    description:
      "Учёт времени, задачи, чаты и отчёты для вашей команды в одном инструменте.",
    url: SITE_URL,
    siteName: "Pandaclock",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pandaclock",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pandaclock — HR-система, которая работает за вас",
    description:
      "Учёт времени, задачи, чаты и отчёты для вашей команды в одном инструменте.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      ru: `${SITE_URL}/`,
      "uz-Latn": `${SITE_URL}/uz/`,
      en: `${SITE_URL}/en/`,
    },
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#5B4FE2",
  width: "device-width",
  initialScale: 1,
};

const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Pandaclock",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  offers: {
    "@type": "Offer",
    priceCurrency: "UZS",
    price: "0",
  },
  url: SITE_URL,
  publisher: {
    "@type": "Organization",
    name: "Pandaclock LLC",
    url: SITE_URL,
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={nunito.variable}>
      <body className="font-sans">
        {children}
        <Script
          id="ld-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
      </body>
    </html>
  );
}
