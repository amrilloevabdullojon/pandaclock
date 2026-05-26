import { Module, type MiddlewareConsumer, type NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { TenantModule } from "./tenant/tenant.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { EmailModule } from "./email/email.module.js";
import { HealthModule } from "./health/health.module.js";
import { DepartmentsModule } from "./departments/departments.module.js";
import { EmployeesModule } from "./employees/employees.module.js";
import { TimeModule } from "./time/time.module.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { RequestsModule } from "./requests/requests.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
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
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    TenantModule,
    EmailModule,
    AuthModule,
    EmployeesModule,
    DepartmentsModule,
    TimeModule,
    TasksModule,
    RequestsModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Эти эндпоинты работают на корневом домене / до выбора tenant.
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: "api/v1/auth/register-company", method: RequestMethod.POST },
        { path: "api/v1/auth/verify-email", method: RequestMethod.POST },
        { path: "api/v1/auth/resend-verification", method: RequestMethod.POST },
        { path: "api/v1/auth/forgot-password", method: RequestMethod.POST },
        { path: "api/v1/auth/reset-password", method: RequestMethod.POST },
        { path: "api/v1/auth/accept-invite", method: RequestMethod.POST },
        { path: "api/v1/health", method: RequestMethod.GET },
      )
      .forRoutes("*");
  }
}
