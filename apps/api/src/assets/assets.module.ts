import { Module } from "@nestjs/common";
import { AssetsService } from "./assets.service.js";
import { AssetsController } from "./assets.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TenantModule, NotificationsModule],
  providers: [AssetsService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
