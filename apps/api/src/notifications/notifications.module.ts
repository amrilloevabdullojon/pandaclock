import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
