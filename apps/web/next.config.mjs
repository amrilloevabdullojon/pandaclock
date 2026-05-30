import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@pandaclock/ui", "@pandaclock/types"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

const withIntl = withNextIntl(nextConfig);

// Sentry — обёртка добавляет source-map upload и tunnel route для production.
// Без SENTRY_AUTH_TOKEN upload skipped, ошибки всё равно ловятся через init configs.
export default withSentryConfig(withIntl, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  tunnelRoute: "/monitoring",
});
