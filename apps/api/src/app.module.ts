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
import { ReportsModule } from "./reports/reports.module.js";
import { CalendarModule } from "./calendar/calendar.module.js";
import { BillingModule } from "./billing/billing.module.js";
import { ChatsModule } from "./chats/chats.module.js";
import { SchedulerModule } from "./scheduler/scheduler.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { SearchModule } from "./search/search.module.js";
import { UploadsModule } from "./uploads/uploads.module.js";
import { OnboardingModule } from "./onboarding/onboarding.module.js";
import { ShiftsModule } from "./shifts/shifts.module.js";
import { PerformanceModule } from "./performance/performance.module.js";
import { HrModule } from "./hr/hr.module.js";
import { RecruitmentModule } from "./recruitment/recruitment.module.js";
import { TravelModule } from "./travel/travel.module.js";
import { SurveysModule } from "./surveys/surveys.module.js";
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
    ReportsModule,
    CalendarModule,
    BillingModule,
    ChatsModule,
    SchedulerModule,
    AuditModule,
    SearchModule,
    UploadsModule,
    OnboardingModule,
    ShiftsModule,
    PerformanceModule,
    HrModule,
    RecruitmentModule,
    TravelModule,
    SurveysModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Эти эндпоинты работают на корневом домене / до выбора tenant.
    // В Nest 11 (Express 5) exclude-пути указываем БЕЗ globalPrefix
    // и используем именованный wildcard '{*splat}' для forRoutes.
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: "auth/register-company", method: RequestMethod.POST },
        { path: "auth/verify-email", method: RequestMethod.POST },
        { path: "auth/resend-verification", method: RequestMethod.POST },
        { path: "auth/forgot-password", method: RequestMethod.POST },
        { path: "auth/reset-password", method: RequestMethod.POST },
        { path: "auth/accept-invite", method: RequestMethod.POST },
        { path: "health", method: RequestMethod.GET },
        { path: "webhooks/click", method: RequestMethod.POST },
        { path: "webhooks/payme", method: RequestMethod.POST },
      )
      .forRoutes({ path: "{*splat}", method: RequestMethod.ALL });
  }
}
