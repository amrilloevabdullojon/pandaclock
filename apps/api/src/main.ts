import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.set("trust proxy", 1);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({
    origin: [
      process.env.APP_URL ?? "http://localhost:3000",
      process.env.MARKETING_URL ?? "http://localhost:3001",
      /^https?:\/\/.+\.pandaclock\.uz$/,
    ],
    credentials: true,
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
