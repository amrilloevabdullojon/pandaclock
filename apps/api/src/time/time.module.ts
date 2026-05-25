import { Module } from "@nestjs/common";
import { TimeService } from "./time.service.js";
import { TimeController } from "./time.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [TimeService],
  controllers: [TimeController],
  exports: [TimeService],
})
export class TimeModule {}
