// Sentry instrumentation должен загружаться раньше всего, чтобы перехватить deps.
import "./instrument.js";
import "reflect-metadata";
import { NestFactory, HttpAdapterHost } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { SentryExceptionFilter } from "./observability/sentry.filter.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Helmet — стандартные security-заголовки (HSTS, X-Frame-Options, и пр).
  // CSP отключаем: у нас JSON API без HTML-страниц, нечего политить.
  // crossOriginResourcePolicy: cross-origin — для аватаров через CDN/R2.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(cookieParser());
  app.set("trust proxy", 1);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // Sentry exception filter — должен быть глобальным, чтобы перехватывать
  // ошибки из всех модулей. Если SENTRY_DSN не задан — filter работает как
  // обычный JSON-формат для 5xx (Sentry-вызовы no-op).
  app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost)));
  app.enableCors({
    origin: [
      process.env.APP_URL ?? "http://localhost:3000",
      process.env.MARKETING_URL ?? "http://localhost:3001",
      /^https?:\/\/.+\.pandaclock\.uz$/,
      // Vercel previews и production
      /^https:\/\/.+\.vercel\.app$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Slug"],
  });

  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Pandaclock API")
      .setDescription("HR SaaS platform — internal API")
      .setVersion("0.0.1")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
  }

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  app.get(Logger).log(`🐼 Pandaclock API listening on http://localhost:${String(port)}`);
}

void bootstrap();
