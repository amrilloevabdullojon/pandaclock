import { Module } from "@nestjs/common";
import { SurveysService } from "./surveys.service.js";
import { SurveysController } from "./surveys.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TenantModule, NotificationsModule],
  providers: [SurveysService],
  controllers: [SurveysController],
  exports: [SurveysService],
})
export class SurveysModule {}
