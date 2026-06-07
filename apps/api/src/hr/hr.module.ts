import { Module } from "@nestjs/common";
import { HrService } from "./hr.service.js";
import { HrController } from "./hr.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TenantModule, NotificationsModule],
  providers: [HrService],
  controllers: [HrController],
  exports: [HrService],
})
export class HrModule {}
