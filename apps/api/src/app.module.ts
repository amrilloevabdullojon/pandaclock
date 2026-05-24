import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { TenantModule } from "./tenant/tenant.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { TenantMiddleware } from "./tenant/tenant.middleware.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === "development"
            ? { target: "pino-pretty", options: { singleLine: true } }
            : undefined,
        autoLogging: true,
        redact: ["req.headers.authorization", "req.headers.cookie"],
      },
    }),
    TenantModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      // Tenant определяется по поддомену для всех роутов,
      // КРОМЕ тех, что работают на корневом домене (регистрация и health).
      .exclude(
        { path: "api/v1/auth/register-company", method: 1 }, // POST
        { path: "api/v1/health", method: 0 }, // GET
      )
      .forRoutes("*");
  }
}
