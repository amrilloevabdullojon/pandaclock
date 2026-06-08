import { Module } from "@nestjs/common";
import { TravelService } from "./travel.service.js";
import { TravelController } from "./travel.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TenantModule, NotificationsModule],
  providers: [TravelService],
  controllers: [TravelController],
  exports: [TravelService],
})
export class TravelModule {}
