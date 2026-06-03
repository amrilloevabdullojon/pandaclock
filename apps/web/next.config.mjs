import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// CSP. Без явного connect-src Vercel ставит дефолтный 'self', который блокирует
// fetch/WebSocket к pandaclock-api-staging.fly.dev — отсюда «чат не работает».
// Разрешаем коннект к API (HTTP + WSS для socket.io), к R2 (картинки/файлы),
// и к Sentry (error reporting).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next.js bootstrap inline + webpack chunks; unsafe-eval для dev (no-op в prod).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' " +
    "https://pandaclock-api-staging.fly.dev wss://pandaclock-api-staging.fly.dev " +
    "https://api.pandaclock.uz wss://api.pandaclock.uz " +
    "https://*.r2.cloudflarestorage.com https://*.r2.dev " +
    "https://*.sentry.io https://*.ingest.sentry.io",
  "media-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@pandaclock/ui", "@pandaclock/types"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: CSP }],
      },
    ];
  },
  // packages/types написан NodeNext-стилем: `import "./foo.js"` указывает на
  // соседний `foo.ts`. Webpack по умолчанию не знает что .js → .ts, поэтому
  // даём ему extensionAlias.
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
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
